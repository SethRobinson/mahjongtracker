function formatDebugSheet(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  
  // Set header formatting
  var headerRange = sheet.getRange(1, 1, 1, lastColumn);
  headerRange.setFontWeight('bold').setBackground('#cfe2f3');
  
  // Set borders for all data
  var dataRange = sheet.getRange(1, 1, lastRow, lastColumn);
  dataRange.setBorder(true, true, true, true, true, true);
  
  // Adjust column widths
  sheet.autoResizeColumns(1, lastColumn);
}

function createDebugInfo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var gamesSheet = ss.getSheetByName("Games");
  var debugSheet = ss.getSheetByName("Debug Games");
  
  // Delete the existing "Debug Games" sheet if it exists
  if (debugSheet) {
    ss.deleteSheet(debugSheet);
  }
  
  // Create a new "Debug Games" sheet
  debugSheet = ss.insertSheet("Debug Games");
  
  var gamesData = gamesSheet.getDataRange().getValues();
  
  // Get player nicknames for mapping
  var playerNicknames = getPlayerNicknames();
  
  // Write the header row (second row from the "Games" sheet)
  var header = gamesData[1];  // Use the second row as header
  // Add extra columns for computed point gain/loss
  var newHeader = header.concat(['CalculatedScoreA', 'CalculatedScoreB', 'CalculatedScoreC', 'CalculatedScoreD']);
  debugSheet.appendRow(newHeader);
  
  // Loop over each game starting from index 2
  for (var i = 2; i < gamesData.length; i++) {
    var game = gamesData[i];
    var playerScores = {};
    var playerNames = [];
    var playerIds = [];
    
    // Check if the row is a valid game (e.g., date is present)
    if (!game[0] || game[0] === '') {
      continue; // Skip empty or invalid rows
    }
    
    // Extract player IDs and scores
    for (var p = 1; p < 8; p += 2) {
      var playerId = game[p];
      var score = parseFloat(game[p + 1]);
      if (playerId && playerId !== "None" && !isNaN(score)) {
        var playerName = playerNicknames[playerId] || playerId;
        playerScores[playerName] = score;
        playerNames.push(playerName);
        playerIds.push(playerId);
      }
    }
    
    // Compute calculated scores if there are at least 2 players
    if (Object.keys(playerScores).length >= 2) {
      var calculatedScores = calculateMahjongScores(playerScores);
      
      // Map calculated scores to the order of the players in the game
      var calcScoresArray = [];
      for (var j = 0; j < playerIds.length; j++) {
        var name = playerNicknames[playerIds[j]] || playerIds[j];
        calcScoresArray.push(calculatedScores[name] || 0);
      }
      
      // Pad the array to have 4 values
      while (calcScoresArray.length < 4) {
        calcScoresArray.push('');
      }
      
      // Append the game data along with calculated scores
      var rowData = game.concat(calcScoresArray);
      debugSheet.appendRow(rowData);
    } else {
      // If not enough players, append the row without calculated scores
      debugSheet.appendRow(game);
    }
  }
  
  // Format the debug sheet
  formatDebugSheet(debugSheet);
  SpreadsheetApp.getUi().alert('Debug info has been created in the "Debug Games" sheet.');
}