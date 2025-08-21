// Teams functionality
function initializeTeamsSheet() {
  if (typeof isTeamModeEnabled === 'function' && !isTeamModeEnabled()) {
    SpreadsheetApp.getUi().alert('Team Mode is disabled. Enable it in Settings first.');
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamsSheet = ss.getSheetByName("Teams");
  
  // Check if Teams sheet already exists
  if (teamsSheet) {
    SpreadsheetApp.getUi().alert(
      'Error: Teams sheet already exists!',
      'To prevent accidental data loss, please manually delete the existing "Teams" sheet first if you want to recreate it.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  // Create Teams sheet
  teamsSheet = ss.insertSheet("Teams");
  
  // Set up headers
  var headers = ["Team ID", "Team Name", "Logo URL"];
  teamsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Format headers
  var headerRange = teamsSheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold')
            .setBackground('#4f81bd')
            .setFontColor('white')
            .setHorizontalAlignment('center')
            .setBorder(true, true, true, true, true, true);
  
  // Set column widths
  teamsSheet.setColumnWidth(1, 80);  // Team ID
  teamsSheet.setColumnWidth(2, 200); // Team Name
  teamsSheet.setColumnWidth(3, 300); // Logo URL
  
  // Add sample teams
  var sampleTeams = [
    [1, "Team Alpha", "https://example.com/team-alpha-logo.png"],
    [2, "Team Beta", "https://example.com/team-beta-logo.png"]
  ];
  
  if (sampleTeams.length > 0) {
    teamsSheet.getRange(2, 1, sampleTeams.length, 3).setValues(sampleTeams);
  }
  
  SpreadsheetApp.getUi().alert('Teams sheet has been created successfully!');
}

function updateTeamRankings() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamsSheet = ss.getSheetByName("Teams");
  var playersSheet = ss.getSheetByName("Players");
  
  if (!teamsSheet) {
    SpreadsheetApp.getUi().alert('Please run "Initialize Teams Sheet" first!');
    return;
  }
  
  // Get all team data
  var teamsData = teamsSheet.getDataRange().getValues();
  var teams = {};
  
  // Build teams object (skip header row)
  for (var i = 1; i < teamsData.length; i++) {
    var teamId = teamsData[i][0];
    var teamName = teamsData[i][1];
    var logoUrl = teamsData[i][2];
    
    if (teamId && teamId !== "") {
      teams[teamId] = {
        name: teamName,
        logoUrl: logoUrl,
        members: [],
        memberDetails: [], // Store both name and country code
        totalScore: 0,
        gamesPlayed: 0
      };
    }
  }
  
  // Get current 4 player rankings to extract scores and games played
  var fourPlayerRankings = ss.getSheetByName("4 Player Season Rankings");
  if (!fourPlayerRankings) {
    SpreadsheetApp.getUi().alert('Please calculate rankings first!');
    return;
  }
  
  var rankingsData = fourPlayerRankings.getDataRange().getValues();
  var playerScores = {};
  var playerGames = {};
  
  // Extract player scores and games played from rankings (skip title and header rows)
  for (var i = 2; i < rankingsData.length; i++) {
    var playerName = rankingsData[i][2]; // Player column
    var score = parseFloat(rankingsData[i][3]) || 0; // Score column
    var games = parseInt(rankingsData[i][4]) || 0; // Games column
    if (playerName && playerName !== "") {
      playerScores[playerName] = score;
      playerGames[playerName] = games;
    }
  }
  
  // Get players data to map players to teams
  var playersData = playersSheet.getDataRange().getValues();
  var playerTeamMap = {};
  
  // Assuming Team ID will be in column G (index 6) after Flag column
  for (var i = 1; i < playersData.length; i++) {
    var meetupName = playersData[i][1]; // Meetup Name column
    var nickName = playersData[i][2]; // Nick Name column
    var countryCode = playersData[i][5]; // Country code column
    var playerName = nickName || meetupName; // Use nickname if available, otherwise meetup name
    var teamId = playersData[i][6]; // Team ID column (after Flag)
    
    if (playerName && teamId && teams[teamId]) {
      playerTeamMap[playerName] = teamId;
      teams[teamId].members.push(playerName);
      teams[teamId].memberDetails.push({
        name: playerName,
        countryCode: countryCode || 'c2'
      });
      teams[teamId].totalScore += playerScores[playerName] || 0;
      teams[teamId].gamesPlayed += playerGames[playerName] || 0;
    }
  }
  
  // Create team rankings sheet
  generateTeamRankingsSheet(ss, teams);
}

function generateTeamRankingsSheet(ss, teams) {
  var sheetName = "Team Rankings (4 Player)";
  var sheet = ss.getSheetByName(sheetName);
  
  // Clear existing sheet or create new one
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }
  
  // Convert teams object to sorted array
  var teamArray = [];
  for (var teamId in teams) {
    if (teams[teamId].members.length > 0) {
      teamArray.push({
        id: teamId,
        name: teams[teamId].name,
        logoUrl: teams[teamId].logoUrl,
        members: teams[teamId].members,
        memberDetails: teams[teamId].memberDetails,
        totalScore: teams[teamId].totalScore,
        gamesPlayed: teams[teamId].gamesPlayed
      });
    }
  }
  
  // Sort by total score descending
  teamArray.sort(function(a, b) {
    return b.totalScore - a.totalScore;
  });
  
  // Add title row - now spanning 6 columns instead of 5
  sheet.getRange(1, 1).setValue("Team Rankings (4 Player)");
  sheet.getRange(1, 1, 1, 6).merge();
  sheet.getRange(1, 1).setFontSize(18).setFontWeight('bold').setFontColor('#1f4e79').setBackground('#cfe2f3').setHorizontalAlignment('center').setVerticalAlignment('middle').setBorder(true, true, true, true, true, true);
  
  // Add headers - now with Games Played
  var headers = ["Rank", "Logo", "Name", "Members", "Games Played", "Team Score"];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(2, 1, 1, headers.length).setFontSize(12).setFontWeight('bold').setFontColor('white').setBackground('#4f81bd').setHorizontalAlignment('center').setVerticalAlignment('middle').setBorder(true, true, true, true, true, true);
  
  // Check if no teams have members
  if (teamArray.length === 0) {
    var noTeamsRow = new Array(headers.length).fill("");
    noTeamsRow[0] = "No teams have members assigned yet.";
    sheet.getRange(3, 1, 1, headers.length).setValues([noTeamsRow]);
    sheet.getRange(3, 1, 1, headers.length).merge();
    sheet.getRange(3, 1).setFontSize(11).setBackground('#dbe5f1').setHorizontalAlignment('center').setVerticalAlignment('middle');
    sheet.setRowHeight(3, 30);
    return;
  }
  
  // Add team data - each team uses 2 actual rows (for proper vertical spacing)
  var currentRow = 3;
  for (var i = 0; i < teamArray.length; i++) {
    var rank = i + 1;
    var team = teamArray[i];
    
    // Merge cells for rank (2 rows)
    sheet.getRange(currentRow, 1, 2, 1).merge();
    sheet.getRange(currentRow, 1).setValue(rank);
    sheet.getRange(currentRow, 1).setFontSize(33); // 3x larger font (11 * 3)
    
    // Logo in merged cells (2 rows) - now in column 2
    sheet.getRange(currentRow, 2, 2, 1).merge();
    if (team.logoUrl && team.logoUrl !== "") {
      // Use IMAGE formula with mode 4 to specify exact size - 70% of current 220px height = 154px
      var logoFormula = '=IMAGE("' + team.logoUrl + '", 4, 154, 154)';
      sheet.getRange(currentRow, 2).setFormula(logoFormula);
    }
    
    // Team name in merged cells (2 rows) - now in column 3
    sheet.getRange(currentRow, 3, 2, 1).merge();
    sheet.getRange(currentRow, 3).setValue(team.name);
    sheet.getRange(currentRow, 3).setFontSize(20);
    sheet.getRange(currentRow, 3).setFontWeight('bold');
    sheet.getRange(currentRow, 3).setVerticalAlignment('middle');
    
    // Merge cells for members (2 rows) - now in column 4
    sheet.getRange(currentRow, 4, 2, 1).merge();
    if (team.members.length > 0) {
      var membersText = team.members.join('\n');
      sheet.getRange(currentRow, 4).setValue(membersText);
      sheet.getRange(currentRow, 4).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
      sheet.getRange(currentRow, 4).setVerticalAlignment('middle');
    }
    
    // Merge cells for games played (2 rows) - now in column 5
    sheet.getRange(currentRow, 5, 2, 1).merge();
    sheet.getRange(currentRow, 5).setValue(team.gamesPlayed);
    sheet.getRange(currentRow, 5).setFontSize(22);
    sheet.getRange(currentRow, 5).setNumberFormat("0"); // Show as integer
    
    // Merge cells for score (2 rows) - now in column 6
    sheet.getRange(currentRow, 6, 2, 1).merge();
    sheet.getRange(currentRow, 6).setValue(team.totalScore);
    sheet.getRange(currentRow, 6).setNumberFormat("0.0");
    sheet.getRange(currentRow, 6).setFontSize(33); // 3x larger font (11 * 3)
    
    // Apply blue background to both rows
    sheet.getRange(currentRow, 1, 2, 6).setBackground('#dbe5f1');
    // Don't override the individual font sizes we just set
    sheet.getRange(currentRow, 4, 2, 1).setFontSize(22); // 2x larger font for player names (11 * 2)
    sheet.getRange(currentRow, 1, 2, 6).setHorizontalAlignment('center');
    sheet.getRange(currentRow, 1, 2, 6).setVerticalAlignment('middle');
    sheet.getRange(currentRow, 1, 2, 6).setBorder(true, true, true, true, true, true);
    
    // Set row heights - slightly reduced to account for smaller logo
    sheet.setRowHeight(currentRow, 30);     // First row
    sheet.setRowHeight(currentRow + 1, 154); // Second row - matches logo height
    
    // Move to next team (skip 2 rows)
    currentRow += 2;
  }
  
  // Set column widths
  sheet.setColumnWidth(1, 80);   // Rank
  sheet.setColumnWidth(2, 170);  // Logo
  sheet.setColumnWidth(3, 260);  // Name - increased by 30% from 200
  sheet.setColumnWidth(4, 300);  // Members  
  sheet.setColumnWidth(5, 120);  // Games Played
  sheet.setColumnWidth(6, 150);  // Team Score
}