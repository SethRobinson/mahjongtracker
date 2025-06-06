function calculateRankings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Calculate all-time rankings
  calculateSeasonRankings();
  
  // Update team rankings after individual rankings are calculated
  updateTeamRankings();
}

function calculateSeasonRankings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gamesSheet = ss.getSheetByName("Games");
  var gamesData = gamesSheet.getDataRange().getValues();
  
  var fourPlayerPlayers = {};
  var threePlayerPlayers = {};
  
  for (var i = 2; i < gamesData.length; i++) {
    var game = gamesData[i];
    var playerScores = {};
    var players = [];
    
    // Skip if date column is empty
    if (!game[0]) continue;
    
    for (var p = 1; p < 8; p += 2) {
      if (game[p] && game[p] !== "None" && game[p + 1] !== "") {
        playerScores[game[p]] = parseFloat(game[p + 1]) || 0;
        players.push(game[p]);
      }
    }
    
    var numPlayers = Object.keys(playerScores).length;
    if (numPlayers < 2) continue;
    
    var calculatedScores = calculateMahjongScores(playerScores);
    
    for (var player in calculatedScores) {
      if (numPlayers === 4) {
        if (!fourPlayerPlayers[player]) {
          fourPlayerPlayers[player] = { score: 0, games: 0, first: 0, second: 0, third: 0, fourth: 0 };
        }
        fourPlayerPlayers[player].score += calculatedScores[player];
        fourPlayerPlayers[player].games++;
        
        // Track placement
        var place = getPlayerPlacement(player, playerScores);
        if (place === 1) fourPlayerPlayers[player].first++;
        else if (place === 2) fourPlayerPlayers[player].second++;
        else if (place === 3) fourPlayerPlayers[player].third++;
        else if (place === 4) fourPlayerPlayers[player].fourth++;
      } else if (numPlayers === 3) {
        if (!threePlayerPlayers[player]) {
          threePlayerPlayers[player] = { score: 0, games: 0, first: 0, second: 0, third: 0 };
        }
        threePlayerPlayers[player].score += calculatedScores[player];
        threePlayerPlayers[player].games++;
        
        // Track placement
        var place = getPlayerPlacement(player, playerScores);
        if (place === 1) threePlayerPlayers[player].first++;
        else if (place === 2) threePlayerPlayers[player].second++;
        else if (place === 3) threePlayerPlayers[player].third++;
      }
    }
  }
  
  // Generate ranking sheets
  generateRankingSheet(ss, fourPlayerPlayers, "4 Player Season Rankings", true);
  generateRankingSheet(ss, threePlayerPlayers, "3 Player Season Rankings", false);
}

function getPlayerPlacement(player, playerScores) {
  var playerScore = playerScores[player];
  var placement = 1;
  
  for (var otherPlayer in playerScores) {
    if (otherPlayer !== player && playerScores[otherPlayer] > playerScore) {
      placement++;
    }
  }
  
  return placement;
}

function generateRankingSheet(ss, playersData, sheetName, isFourPlayer) {
  var sheet = ss.getSheetByName(sheetName);
  
  // Clear existing sheet or create new one
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Convert to array and sort by score
  var rankings = [];
  for (var player in playersData) {
    rankings.push({
      player: player,
      data: playersData[player]
    });
  }
  
  rankings.sort(function(a, b) {
    return b.data.score - a.data.score;
  });
  
  // Add title row
  var numCols = isFourPlayer ? 9 : 8;
  sheet.getRange(1, 1).setValue(sheetName);
  sheet.getRange(1, 1, 1, numCols).merge();
  sheet.getRange(1, 1).setFontSize(18).setFontWeight('bold').setFontColor('#1f4e79').setBackground('#cfe2f3').setHorizontalAlignment('center').setVerticalAlignment('middle').setBorder(true, true, true, true, true, true);
  
  // Add headers
  var headers = ["Rank", "Flag", "Player", "Score", "Games"];
  if (isFourPlayer) {
    headers = headers.concat(["1st", "2nd", "3rd", "4th"]);
  } else {
    headers = headers.concat(["1st", "2nd", "3rd"]);
  }
  
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, 1, headers.length).setFontSize(12).setFontWeight('bold').setFontColor('white').setBackground('#4f81bd').setHorizontalAlignment('center').setVerticalAlignment('middle').setBorder(true, true, true, true, true, true);
  
  // Check if no games played
  if (rankings.length === 0) {
    var noGamesRow = new Array(headers.length).fill("");
    noGamesRow[0] = "No games played in this date range yet.";
    sheet.getRange(3, 1, 1, headers.length).setValues([noGamesRow]);
    sheet.getRange(3, 1, 1, headers.length).merge();
    sheet.getRange(3, 1).setFontSize(11).setBackground('#dbe5f1').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(3, 20);
    return;
  }
  
  // Add data with country flag formulas
  var playersSheet = ss.getSheetByName("Players");
  var playersData = playersSheet.getDataRange().getValues();
  var playerCountryMap = {};
  var playerNicknameMap = {};
  
  // Build country and nickname maps
  for (var i = 1; i < playersData.length; i++) {
    var meetupName = playersData[i][1];
    var nickName = playersData[i][2];
    var countryCode = playersData[i][5] || 'c2'; // Column F for country code
    playerCountryMap[meetupName] = countryCode;
    // Map player ID to nickname for display - use nickname if it exists and is not empty
    if (nickName && nickName.trim() !== '') {
      playerNicknameMap[meetupName] = nickName;
    } else {
      playerNicknameMap[meetupName] = meetupName;
    }
    if (nickName) {
      playerCountryMap[nickName] = countryCode;
    }
  }
  
  for (var i = 0; i < rankings.length; i++) {
    var rank = i + 1;
    var player = rankings[i];
    // Use nickname for display
    var displayName = playerNicknameMap[player.player] || player.player;
    var countryCode = playerCountryMap[player.player] || 'c2';
    var flagUrl = getFlagUrl(countryCode);
    var flagFormula = '=IMAGE("' + flagUrl + '", 4, 20, 30)';
    
    var rowData = [
      rank,
      flagFormula,
      displayName,
      formatScore(player.data.score),
      player.data.games
    ];
    
    if (isFourPlayer) {
      rowData = rowData.concat([
        player.data.first,
        player.data.second,
        player.data.third,
        player.data.fourth
      ]);
    } else {
      rowData = rowData.concat([
        player.data.first,
        player.data.second,
        player.data.third
      ]);
    }
    
    // Use formulas for proper display
    var row = i + 3; // Starting from row 3 (after title and headers)
    sheet.getRange(row, 1).setValue(rank);
    sheet.getRange(row, 2).setFormula(flagFormula);
    sheet.getRange(row, 3).setValue(displayName);
    sheet.getRange(row, 4).setValue(player.data.score);
    sheet.getRange(row, 5).setValue(player.data.games);
    
    // Add placement data
    var col = 6;
    if (isFourPlayer) {
      sheet.getRange(row, col++).setValue(player.data.first);
      sheet.getRange(row, col++).setValue(player.data.second);
      sheet.getRange(row, col++).setValue(player.data.third);
      sheet.getRange(row, col++).setValue(player.data.fourth);
    } else {
      sheet.getRange(row, col++).setValue(player.data.first);
      sheet.getRange(row, col++).setValue(player.data.second);
      sheet.getRange(row, col++).setValue(player.data.third);
    }
    
    // Format score column
    sheet.getRange(row, 4).setNumberFormat("0.0");
  }
  
  // Apply data range formatting
  if (rankings.length > 0) {
    var dataRange = sheet.getRange(3, 1, rankings.length, headers.length);
    dataRange.setFontSize(11).setBackground('#dbe5f1');
    dataRange.setHorizontalAlignment('center').setVerticalAlignment('middle');
    dataRange.setBorder(true, true, true, true, true, true);
  }
  
  // Format columns - use 100 for most columns except Flag and Player
  sheet.setColumnWidths(1, headers.length, 100);
  sheet.setColumnWidth(2, 50);   // Flag column
  sheet.setColumnWidth(3, 200);  // Player column wider
  
  // Adjust row heights
  sheet.setRowHeights(1, 2 + rankings.length, 20);
}

function calculateTodaysRankings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gamesSheet = ss.getSheetByName("Games");
  var gamesData = gamesSheet.getDataRange().getValues();
  
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get player nicknames for mapping
  var playerNicknames = getPlayerNicknames();
  
  var fourPlayerPlayers = {};
  var threePlayerPlayers = {};
  
  for (var i = 2; i < gamesData.length; i++) {
    var game = gamesData[i];
    var gameDate = new Date(game[0]);
    gameDate.setHours(0, 0, 0, 0);
    
    // Skip if not today
    if (gameDate.getTime() !== today.getTime()) continue;
    
    var playerScores = {};
    var players = [];
    
    for (var p = 1; p < 8; p += 2) {
      if (game[p] && game[p] !== "None" && game[p + 1] !== "") {
        playerScores[game[p]] = parseFloat(game[p + 1]) || 0;
        players.push(game[p]);
      }
    }
    
    var numPlayers = Object.keys(playerScores).length;
    if (numPlayers < 2) continue;
    
    var calculatedScores = calculateMahjongScores(playerScores);
    
    for (var player in calculatedScores) {
      if (numPlayers === 4) {
        if (!fourPlayerPlayers[player]) {
          fourPlayerPlayers[player] = { score: 0, games: 0 };
        }
        fourPlayerPlayers[player].score += calculatedScores[player];
        fourPlayerPlayers[player].games++;
      } else if (numPlayers === 3) {
        if (!threePlayerPlayers[player]) {
          threePlayerPlayers[player] = { score: 0, games: 0 };
        }
        threePlayerPlayers[player].score += calculatedScores[player];
        threePlayerPlayers[player].games++;
      }
    }
  }
  
  // Generate today's ranking sheets
  generateSimpleRankingSheet(ss, fourPlayerPlayers, "4 Player Today Rankings");
  generateSimpleRankingSheet(ss, threePlayerPlayers, "3 Player Today Rankings");
}

function generateSimpleRankingSheet(ss, playersData, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  
  // Convert to array and sort by score
  var rankings = [];
  for (var player in playersData) {
    rankings.push({
      player: player,
      score: playersData[player].score,
      games: playersData[player].games
    });
  }
  
  rankings.sort(function(a, b) {
    return b.score - a.score;
  });
  
  // Add title
  sheet.getRange(1, 1).setValue(sheetName);
  sheet.getRange(1, 1, 1, 4).merge();
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');
  
  // Add headers
  var headers = ["Rank", "Player", "Score", "Games"];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, 1, headers.length).setFontWeight('bold').setBackground('#4f81bd').setFontColor('white');
  
  // Get player nicknames for display
  var playerNicknames = getPlayerNicknames();
  
  // Add data
  for (var i = 0; i < rankings.length; i++) {
    // Use nickname for display
    var displayName = playerNicknames[rankings[i].player] || rankings[i].player;
    var rowData = [
      i + 1,
      displayName,
      rankings[i].score,
      rankings[i].games
    ];
    sheet.getRange(i + 3, 1, 1, rowData.length).setValues([rowData]);
    
    // Add alternating row colors
    if (i % 2 === 1) {
      sheet.getRange(i + 3, 1, 1, rowData.length).setBackground('#f3f3f3');
    }
  }
  
  // Format columns
  sheet.setColumnWidth(1, 50);  // Rank
  sheet.setColumnWidth(2, 150); // Player
  sheet.setColumnWidth(3, 80);  // Score
  sheet.setColumnWidth(4, 60);  // Games
  
  // Add borders
  sheet.getRange(2, 1, rankings.length + 1, headers.length).setBorder(true, true, true, true, true, true);
}

function calculateMahjongScores(playerScores) {
  var filteredPlayerScores = {};
  for (var player in playerScores) {
    if (player !== "None") {
      filteredPlayerScores[player] = playerScores[player];
    }
  }

  var sortedPlayers = Object.keys(filteredPlayerScores).sort(function(a, b) {
    return filteredPlayerScores[b] - filteredPlayerScores[a];
  });

  var calculatedScores = {};
  sortedPlayers.forEach(function(player, index) {
    var score = filteredPlayerScores[player];

    if (sortedPlayers.length === 4) {
      // Four player game
      if (index === 0) {
        calculatedScores[player] = ((score - 30000) / 1000) + 30;
      } else if (index === 1) {
        calculatedScores[player] = ((score - 30000) / 1000) + 10;
      } else if (index === 2) {
        calculatedScores[player] = ((score - 30000) / 1000) - 10;
      } else {
        calculatedScores[player] = ((score - 30000) / 1000) - 30;
      }
    } else if (sortedPlayers.length === 3) {
      // Three player game
      if (index === 0) {
        calculatedScores[player] = ((score - 40000) / 1000) + 30;
      } else if (index === 1) {
        calculatedScores[player] = ((score - 40000) / 1000) - 10;
      } else if (index === 2) {
        calculatedScores[player] = ((score - 40000) / 1000) - 20;
      }
    }
  });

  return calculatedScores;
}

function showRankingDialog() {
  var html = HtmlService.createHtmlOutputFromFile('ranking')
      .setWidth(400)
      .setHeight(300);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Calculate Custom Rankings');
}

function calculateCustomRankings(startDate, endDate) {
  // Implementation for custom date range rankings
  // This would be similar to calculateSeasonRankings but with date filtering
  SpreadsheetApp.getUi().alert('Custom rankings from ' + startDate + ' to ' + endDate + ' calculated!');
}