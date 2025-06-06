function getPlayerNicknames() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Players');
  var playersData = sheet.getDataRange().getValues();
  var playerNicknames = {};
  for (var i = 1; i < playersData.length; i++) {
    var playerId = playersData[i][1]; // Assuming column B has player IDs
    var playerName = playersData[i][2]; // Assuming column C has player names
    playerNicknames[playerId] = playerName || playerId; // Use ID if no nickname
  }
  return playerNicknames;
}

function getFlagUrl(countryCode) {
  if (!countryCode || countryCode === '') {
    countryCode = 'c2'; // Default to c2 flag if no country code is provided
  }
  return `https://rtsoft.com/graphics/flags/png100px/${countryCode.toLowerCase()}.png`;
}

function getCountryEmoji(countryCode) {
  // Convert country code to emoji flag
  // Country codes should be 2-letter ISO codes
  if (!countryCode || countryCode === '') {
    countryCode = 'us'; // Default to US
  }
  
  // Special case for c2 which seems to be used as US in this system
  if (countryCode.toLowerCase() === 'c2') {
    countryCode = 'us';
  }
  
  // Convert country code to emoji
  var code = countryCode.toUpperCase();
  if (code.length !== 2) {
    return '🏳️'; // Default flag for invalid codes
  }
  
  // Convert letters to regional indicator symbols
  var flagEmoji = '';
  for (var i = 0; i < 2; i++) {
    var charCode = code.charCodeAt(i);
    // A = 65, Regional Indicator A = 127462
    flagEmoji += String.fromCodePoint(charCode - 65 + 127462);
  }
  
  return flagEmoji;
}

//make it look like 23.0  and not 23 or 23.28372873.  (actually no not needed, we do it in the sheet instead)
function formatScore(score) {
  var formattedScore = score.toFixed(1);
  /*
  if (!formattedScore.includes('.')) {
    formattedScore += '.0';
  }
  */
  return formattedScore;
}

// Toast message helper function
function showToastMessage(message, title) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast(message, title || 'Notification', 3);
}