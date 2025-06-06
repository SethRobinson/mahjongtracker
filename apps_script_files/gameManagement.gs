function showDialog() {
  var html = HtmlService.createHtmlOutputFromFile('index')
      .setWidth(600)
      .setHeight(700);
  SpreadsheetApp.getUi()
      .showModalDialog(html, 'Add Game');
}

function getPlayersData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
  var data = sheet.getDataRange().getValues();
  var players = [];
  for (var i = 1; i < data.length; i++) {
    // Skip inactive players
    if (data[i][0] === 'Yes') {
      players.push({
        id: data[i][1],
        name: data[i][2],
        meetupName: data[i][1],
        nickname: data[i][2],
        colorGroup: data[i][3],
        countryCode: data[i][5] || 'c2' // Use c2 as default
      });
    }
  }
  return players;
}

// Function that matches what the HTML expects
function getPlayers() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
  var playersData = sheet.getRange('A2:C').getValues().filter(row => row[0] === true);
  return playersData;
}

function addGame(data) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Games');
    var newRow = [
      new Date(data.date),
      data.player1 || 'None', parseFloat(data.score1) || 0,
      data.player2 || 'None', parseFloat(data.score2) || 0,
      data.player3 || 'None', parseFloat(data.score3) || 0,
      data.player4 || 'None', parseFloat(data.score4) || 0
    ];
    sheet.appendRow(newRow);
    return { success: true };
  } catch (error) {
    throw new Error('Error adding game: ' + error.toString());
  }
}

function addGameAndUpdateRankings(data) {
  try {
    // Add the game
    addGame(data);
    
    // Recalculate rankings automatically
    calculateRankings();
    
    // Return success immediately to close dialog
    return { success: true };
  } catch (error) {
    throw error;
  }
}

function showToastAndCalculateRankings() {
  try {
    // Show toast notification with 5 second duration
    SpreadsheetApp.getActiveSpreadsheet().toast('Game added! Calculating rankings...', 'Processing', 5);
    
    // Calculate rankings (which triggers team rankings and web update)
    calculateRankings();
    
    // Show completion toast
    SpreadsheetApp.getActiveSpreadsheet().toast('Rankings updated successfully!', 'Complete', 3);
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error updating rankings: ' + error.toString());
  }
}