// Seating Plan functionality
function showSeatingPlanDialog() {
  var html = HtmlService.createHtmlOutputFromFile('seatingDialog')
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Create Table Seating Plan');
}

function generateSeatingPlan(numTables, numRounds) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var teamsSheet = ss.getSheetByName("Teams");
    var playersSheet = ss.getSheetByName("Players");
    
    if (!teamsSheet || !playersSheet) {
      throw new Error("Teams or Players sheet not found!");
    }
    
    // Get teams and players data
    var teamsData = getTeamsWithPlayers();
    
    // Validate we have enough players
    var totalPlayers = 0;
    for (var teamId in teamsData) {
      totalPlayers += teamsData[teamId].players.length;
    }
    
    if (totalPlayers < numTables * 4) {
      throw new Error("Not enough players (" + totalPlayers + ") for " + numTables + " tables (need " + (numTables * 4) + ")");
    }
    
    // Generate the seating plan
    var rounds = generateRounds(teamsData, numTables, numRounds);
    
    // Create or update the sheet
    createSeatingPlanSheet(ss, rounds, teamsData);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getTeamsWithPlayers() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamsSheet = ss.getSheetByName("Teams");
  var playersSheet = ss.getSheetByName("Players");
  
  // Get teams data
  var teamsData = teamsSheet.getDataRange().getValues();
  var teams = {};
  
  // Build teams object (skip header row)
  for (var i = 1; i < teamsData.length; i++) {
    var teamId = teamsData[i][0];
    var teamName = teamsData[i][1];
    
    if (teamId && teamId !== "") {
      teams[teamId] = {
        id: teamId,
        name: teamName,
        players: []
      };
    }
  }
  
  // Get players data
  var playersData = playersSheet.getDataRange().getValues();
  
  // Map players to teams (skip header row)
  for (var i = 1; i < playersData.length; i++) {
    var isActive = playersData[i][0]; // Active column
    var meetupName = playersData[i][1]; // Meetup Name column
    var nickName = playersData[i][2]; // Nick Name column
    var teamId = playersData[i][6]; // Team ID column (after Flag)
    
    if (isActive === true && teamId && teams[teamId]) {
      var playerName = nickName || meetupName;
      teams[teamId].players.push({
        name: playerName,
        teamId: teamId,
        teamName: teams[teamId].name
      });
    }
  }
  
  return teams;
}

// Generate ONE possible schedule (sequential heuristic)
function generateRoundsOnce(teamsData, numTables, numRounds) {
  var rounds = [];
  var pairingHistory = {}; // Track who has sat with whom
  var allPlayers = [];
  
  // Build a flat list of all players
  for (var teamId in teamsData) {
    allPlayers = allPlayers.concat(teamsData[teamId].players);
  }

  // Generate rounds
  var rotatedPlayers = allPlayers.slice();
  for (var round = 0; round < numRounds; round++) {
    // Rotate the player ordering each round for determinism/variety
    if (round > 0) {
      rotatedPlayers.push(rotatedPlayers.shift());
    }

    var { tables } = generateTablesForRound(rotatedPlayers, numTables, pairingHistory);

    // Detect duplicates before updating history
    var duplicatePairings = detectDuplicatePairs(tables, pairingHistory);

    // If generation failed fallback
    if (tables.length !== numTables) {
      tables = [];
      duplicatePairings = [];
      var availablePlayers = shuffleArray(rotatedPlayers);
      for (var t = 0; t < numTables && availablePlayers.length >= 4; t++) {
        var seating = findBestTableSeating(availablePlayers, pairingHistory);
        if (seating.length === 4) {
          tables.push({ tableNumber: t + 1, players: seating });
          seating.forEach(function(p){
            var idx = availablePlayers.findIndex(x => x.name === p.name);
            if (idx > -1) availablePlayers.splice(idx,1);
          });
        }
      }
      // recompute duplicates after fallback
      duplicatePairings = detectDuplicatePairs(tables, pairingHistory);
    }

    var roundData = {
      roundNumber: round + 1,
      tables: tables,
      duplicatePairings: duplicatePairings
    };

    rounds.push(roundData);

    // Update pairing history with actual round number for each table
    tables.forEach(function(tbl) {
      updatePairingHistory(pairingHistory, tbl.players, round + 1);
    });
  }
  return rounds;
}

// Attempt to build many schedules and pick the one with the fewest duplicate pairings
function generateRounds(teamsData, numTables, numRounds) {
  var bestRounds = [];
  var minDuplicates = Infinity;
  var maxAttempts = 500; // Try up to 500 full-schedule attempts

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var candidateRounds = generateRoundsOnce(teamsData, numTables, numRounds);

    // Count total duplicates across all rounds
    var dupCount = 0;
    for (var r = 0; r < candidateRounds.length; r++) {
      dupCount += candidateRounds[r].duplicatePairings.length;
    }

    if (dupCount < minDuplicates) {
      minDuplicates = dupCount;
      bestRounds = candidateRounds;
    }

    // Early exit if perfect schedule (0 duplicates) found
    if (minDuplicates === 0) {
      break;
    }
  }

  return bestRounds;
}

// Helper to detect duplicate pairings against existing history
function detectDuplicatePairs(tables, existingHistory) {
  var duplicates = [];
  tables.forEach(function(tbl) {
    var players = tbl.players;
    for (var i = 0; i < players.length - 1; i++) {
      for (var j = i + 1; j < players.length; j++) {
        var pairKey = getPairKey(players[i].name, players[j].name);
        if (existingHistory[pairKey] && existingHistory[pairKey].length > 0) {
          duplicates.push({
            player1: players[i].name,
            player2: players[j].name,
            previousRounds: existingHistory[pairKey].slice()
          });
        }
      }
    }
  });
  return duplicates;
}

// Generate seating for an entire round in one go to guarantee all tables are filled
function generateTablesForRound(playerPool, numTables, pairingHistory) {
  var bestTables = [];
  var bestDuplicates = [];
  var minPenalty = Infinity;
  var attempts = 8000; // High to improve success rate
  var playerCount = playerPool.length;

  if (playerCount < numTables * 4) {
    return { tables: [], duplicatePairings: [] };
  }

  var indices = [...Array(playerCount).keys()];

  for (var attempt = 0; attempt < attempts; attempt++) {
    // Shuffle indices deterministically using attempt as seed-like tweak
    var shuffled = shuffleArray(indices);

    var tables = [];
    var valid = true;
    var penalty = 0;

    for (var t = 0; t < numTables; t++) {
      var group = [];
      for (var i = 0; i < 4; i++) {
        var playerIdx = shuffled[t * 4 + i];
        group.push(playerPool[playerIdx]);
      }

      // Verify team uniqueness
      var teamsSet = new Set(group.map(g => g.teamId));
      if (teamsSet.size !== 4) {
        valid = false;
        break;
      }

      penalty += calculateSeatingPenalty(group, pairingHistory);

      tables.push({ tableNumber: t + 1, players: group });
    }

    if (valid) {
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestTables = tables;
        bestDuplicates = [];
        if (penalty === 0) break;
      }
    }
  }

  return { tables: bestTables };
}

function findBestTableSeating(availablePlayers, pairingHistory) {
  var bestSeating = [];
  var minPenalty = Infinity;
  
  // First, try multiple random configurations
  for (var attempt = 0; attempt < 200; attempt++) {
    var candidates = shuffleArray(availablePlayers.slice());
    var seating = [];
    var used = {};
    
    // Try to seat 4 players
    for (var i = 0; i < candidates.length && seating.length < 4; i++) {
      var player = candidates[i];
      
      // Check if this player can sit with the already seated players
      var canSit = true;
      
      // Check team constraint
      for (var j = 0; j < seating.length; j++) {
        if (seating[j].teamId === player.teamId) {
          canSit = false;
          break;
        }
      }
      
      if (canSit && !used[player.name]) {
        seating.push(player);
        used[player.name] = true;
      }
    }
    
    // If we found a valid seating of 4 players
    if (seating.length === 4) {
      var penalty = calculateSeatingPenalty(seating, pairingHistory);
      
      if (penalty < minPenalty) {
        minPenalty = penalty;
        bestSeating = seating;
        
        // If we found a perfect seating (no repeats), stop searching
        if (penalty === 0 && attempt > 20) {
          break;
        }
      }
    }
  }
  
  // If random approach failed, try a more systematic approach
  if (bestSeating.length < 4) {
    bestSeating = findSystematicSeating(availablePlayers, pairingHistory);
  }
  
  return bestSeating;
}

// Systematic approach to find a valid seating when random fails
function findSystematicSeating(availablePlayers, pairingHistory) {
  // Group players by team
  var playersByTeam = {};
  for (var i = 0; i < availablePlayers.length; i++) {
    var player = availablePlayers[i];
    if (!playersByTeam[player.teamId]) {
      playersByTeam[player.teamId] = [];
    }
    playersByTeam[player.teamId].push(player);
  }
  
  // Get teams sorted by number of players (ascending)
  var teams = Object.keys(playersByTeam).sort(function(a, b) {
    return playersByTeam[a].length - playersByTeam[b].length;
  });
  
  var seating = [];
  var usedTeams = {};
  
  // Try to pick one player from each team
  for (var t = 0; t < teams.length && seating.length < 4; t++) {
    var teamId = teams[t];
    if (!usedTeams[teamId] && playersByTeam[teamId].length > 0) {
      // Pick the player with the lowest penalty
      var bestPlayer = null;
      var minPenalty = Infinity;
      
      for (var p = 0; p < playersByTeam[teamId].length; p++) {
        var player = playersByTeam[teamId][p];
        var penalty = 0;
        
        // Calculate penalty with already seated players
        for (var s = 0; s < seating.length; s++) {
          var pairKey = getPairKey(player.name, seating[s].name);
          if (pairingHistory[pairKey]) {
            penalty += pairingHistory[pairKey].length;
          }
        }
        
        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestPlayer = player;
        }
      }
      
      if (bestPlayer) {
        seating.push(bestPlayer);
        usedTeams[teamId] = true;
      }
    }
  }
  
  return seating;
}

function calculateSeatingPenalty(seating, pairingHistory) {
  var penalty = 0;
  
  // Check all pairs in this seating
  for (var i = 0; i < seating.length - 1; i++) {
    for (var j = i + 1; j < seating.length; j++) {
      var pairKey = getPairKey(seating[i].name, seating[j].name);
      if (pairingHistory[pairKey]) {
        penalty += pairingHistory[pairKey].length; // More meetings = higher penalty
      }
    }
  }
  
  return penalty;
}

function updatePairingHistory(pairingHistory, tableSeating, roundNumber) {
  var duplicates = [];
  
  // Update history for all pairs at this table
  for (var i = 0; i < tableSeating.length - 1; i++) {
    for (var j = i + 1; j < tableSeating.length; j++) {
      var pairKey = getPairKey(tableSeating[i].name, tableSeating[j].name);
      
      if (!pairingHistory[pairKey]) {
        pairingHistory[pairKey] = [];
      } else {
        // This is a duplicate pairing
        duplicates.push({
          player1: tableSeating[i].name,
          player2: tableSeating[j].name,
          previousRounds: pairingHistory[pairKey].slice()
        });
      }
      
      pairingHistory[pairKey].push(roundNumber);
    }
  }
  
  return duplicates;
}

function getPairKey(player1, player2) {
  // Create a consistent key regardless of order
  return [player1, player2].sort().join('|');
}

function shuffleArray(array) {
  var newArray = array.slice();
  for (var i = newArray.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = newArray[i];
    newArray[i] = newArray[j];
    newArray[j] = temp;
  }
  return newArray;
}

function createSeatingPlanSheet(ss, rounds, teamsData) {
  var sheetName = "Seating Plan";
  var sheet = ss.getSheetByName(sheetName);
  
  // Clear existing sheet or create new one
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  
  var currentRow = 1;
  
  // Title
  sheet.getRange(currentRow, 1).setValue("Tournament Seating Plan");
  sheet.getRange(currentRow, 1, 1, 5).merge();
  sheet.getRange(currentRow, 1).setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
  currentRow += 2;
  
  // Process each round
  for (var r = 0; r < rounds.length; r++) {
    var round = rounds[r];
    
    // Round header
    sheet.getRange(currentRow, 1).setValue("Round " + round.roundNumber);
    sheet.getRange(currentRow, 1, 1, 5).merge();
    sheet.getRange(currentRow, 1).setFontSize(14).setFontWeight('bold').setBackground('#4f81bd').setFontColor('white');
    currentRow++;
    
    // Table headers
    var headers = ["Table", "Player 1", "Player 2", "Player 3", "Player 4"];
    sheet.getRange(currentRow, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(currentRow, 1, 1, headers.length).setFontWeight('bold').setBackground('#cfe2f3');
    currentRow++;
    
    // Table data
    for (var t = 0; t < round.tables.length; t++) {
      var table = round.tables[t];
      var rowData = [table.tableNumber];
      
      // Add players
      for (var p = 0; p < 4; p++) {
        if (p < table.players.length) {
          rowData.push(table.players[p].name + " (" + table.players[p].teamName + ")");
        } else {
          rowData.push("-");
        }
      }
      
      sheet.getRange(currentRow, 1, 1, rowData.length).setValues([rowData]);
      sheet.getRange(currentRow, 1, 1, rowData.length).setBorder(true, true, true, true, true, true);
      currentRow++;
    }
    
    currentRow++; // Space between rounds
    
    // Team games summary
    var teamGames = calculateTeamGamesAfterRound(teamsData, rounds, r + 1);
    sheet.getRange(currentRow, 1).setValue("Team Games Played After Round " + (r + 1) + ":");
    sheet.getRange(currentRow, 1, 1, 3).merge();
    sheet.getRange(currentRow, 1).setFontWeight('bold');
    currentRow++;
    
    for (var teamId in teamGames) {
      sheet.getRange(currentRow, 1).setValue(teamsData[teamId].name + ": " + teamGames[teamId] + " games");
      sheet.getRange(currentRow, 1, 1, 3).merge();
      currentRow++;
    }
    
    currentRow++; // Space
    
    // Duplicate pairings for this round
    if (round.duplicatePairings.length > 0) {
      sheet.getRange(currentRow, 1).setValue("Duplicate Pairings in Round " + (r + 1) + ":");
      sheet.getRange(currentRow, 1, 1, 5).merge();
      sheet.getRange(currentRow, 1).setFontWeight('bold').setFontColor('#ff0000').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
      currentRow++;
      
      for (var d = 0; d < round.duplicatePairings.length; d++) {
        var dup = round.duplicatePairings[d];
        sheet.getRange(currentRow, 1).setValue(
          dup.player1 + " & " + dup.player2 + " (previously played in rounds: " + 
          dup.previousRounds.join(", ") + ")"
        );
        sheet.getRange(currentRow, 1, 1, 5).merge();
        sheet.getRange(currentRow, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
        currentRow++;
      }
    }
    
    currentRow += 2; // Extra space between rounds
  }
  
  // Auto-resize columns to fit typical data first
  for (var col = 1; col <= 5; col++) {
    sheet.autoResizeColumn(col);
  }

  // Limit column widths to a reasonable size for readability
  sheet.setColumnWidths(1, 5, 200);
}

function calculateTeamGamesAfterRound(teamsData, rounds, upToRound) {
  var teamGames = {};
  
  // Initialize counts
  for (var teamId in teamsData) {
    teamGames[teamId] = 0;
  }
  
  // Count games for each team
  for (var r = 0; r < upToRound && r < rounds.length; r++) {
    var round = rounds[r];
    
    for (var t = 0; t < round.tables.length; t++) {
      var table = round.tables[t];
      
      // Count unique teams at this table
      var teamsAtTable = new Set();
      for (var p = 0; p < table.players.length; p++) {
        teamsAtTable.add(table.players[p].teamId);
      }
      
      // Each team at the table played one game
      teamsAtTable.forEach(function(teamId) {
        teamGames[teamId]++;
      });
    }
  }
  
  return teamGames;
} 