// HTML Export Functions
function exportRankingsToHtml() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Generate HTML content
    var htmlContent = generateRankingsHtml();
    
    // Create or update the HTML file in Google Drive
    var fileName = "Mahjong_Rankings_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd") + ".html";
    var files = DriveApp.getFilesByName(fileName);
    var file;
    
    if (files.hasNext()) {
      // Update existing file - ensure UTF-8 encoding
      file = files.next();
      var blob = Utilities.newBlob(htmlContent, 'text/html; charset=utf-8', fileName);
      file.setContent(blob);
    } else {
      // Create new file with UTF-8 encoding
      var blob = Utilities.newBlob(htmlContent, 'text/html; charset=utf-8', fileName);
      file = DriveApp.createFile(blob);
    }
    
    // Make file publicly accessible (read-only)
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    
    // Get the shareable links - using preview mode for proper HTML rendering
    var fileId = file.getId();
    var viewUrl = "https://drive.google.com/file/d/" + fileId + "/preview";
    var directUrl = "https://drive.google.com/uc?export=view&id=" + fileId;
    
    // Also create a permanent "latest" file
    var latestFiles = DriveApp.getFilesByName("Mahjong_Rankings_Latest.html");
    var latestFile;
    
    if (latestFiles.hasNext()) {
      latestFile = latestFiles.next();
      var latestBlob = Utilities.newBlob(htmlContent, 'text/html; charset=utf-8', "Mahjong_Rankings_Latest.html");
      latestFile.setContent(latestBlob);
    } else {
      var latestBlob = Utilities.newBlob(htmlContent, 'text/html; charset=utf-8', "Mahjong_Rankings_Latest.html");
      latestFile = DriveApp.createFile(latestBlob);
      latestFile.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    }
    
    var latestId = latestFile.getId();
    var latestViewUrl = "https://drive.google.com/file/d/" + latestId + "/preview";
    var latestDirectUrl = "https://drive.google.com/uc?export=view&id=" + latestId;
    
    // Show success message with URLs and instructions
    ui.alert(
      'HTML Export Successful!',
      'Rankings have been exported to Google Drive.\n\n' +
      'Direct download links:\n' +
      'Today: ' + directUrl + '\n' +
      'Latest: ' + latestDirectUrl + '\n\n' +
      'To view as webpage:\n' +
      '1. Use htmlpreview.github.io (paste the download link)\n' +
      '2. Or upload to any web hosting service\n' +
      '3. Or use the alternative method below',
      ui.ButtonSet.OK
    );
    
    // Also provide alternative viewing method
    createHtmlViewerSheet(htmlContent);
    
  } catch (error) {
    ui.alert('Export Error', 'Failed to export rankings: ' + error.toString(), ui.ButtonSet.OK);
  }
}

function generateRankingsHtml() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var htmlParts = [];
  
  // HTML header with CSS - ensure UTF-8 encoding
  htmlParts.push(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mahjong Rankings</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f0f4f8;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #1f4e79;
      background-color: #cfe2f3;
      padding: 15px;
      margin: 0 0 20px 0;
      text-align: center;
      border: 1px solid #4f81bd;
      font-size: 24px;
    }
    h2 {
      color: #1f4e79;
      background-color: #cfe2f3;
      padding: 12px;
      text-align: center;
      border: 1px solid #4f81bd;
      margin: 0 0 0 0;
    }
    .ranking-section {
      background: white;
      border-radius: 8px;
      padding: 0;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .ranking-section table {
      margin: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    th {
      background-color: #4f81bd;
      color: white;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      border: 1px solid #4f81bd;
    }
    td {
      padding: 10px;
      border: 1px solid #a0c0e0;
      background-color: #dbe5f1;
      text-align: center;
    }
    td.player-name, td.team-name {
      text-align: left;
    }
    tr:hover td {
      background-color: #c5d9ec;
    }
    .flag-emoji {
      font-size: 1.5em;
      margin-right: 8px;
      display: none; /* Hidden by default, shown when flag image fails */
    }
    .flag-image {
      width: 24px;
      height: 16px;
      margin-right: 8px;
      vertical-align: middle;
      border: 1px solid #ddd;
    }
    .rank-1 { color: #B8860B; font-weight: bold; font-size: 1.1em; }
    .rank-2 { color: #696969; font-weight: bold; font-size: 1.1em; }
    .rank-3 { color: #8B4513; font-weight: bold; font-size: 1.1em; }
    .team-logo {
      width: 30px;
      height: 30px;
      margin-right: 10px;
      vertical-align: middle;
    }
    .team-members {
      font-size: 0.9em;
      color: #666;
    }
    .update-time {
      text-align: center;
      color: #666;
      font-size: 0.9em;
      margin-top: 20px;
    }
    .nav-links {
      text-align: center;
      margin: 20px 0;
    }
    .nav-links a {
      margin: 0 10px;
      text-decoration: none;
      color: #4f81bd;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Mahjong Rankings</h1>
    <div class="nav-links">
      <a href="#four-player">4 Player Rankings</a>
      <a href="#three-player">3 Player Rankings</a>
      <a href="#team-rankings">Team Rankings</a>
    </div>
`);

  // Add 4 Player Rankings
  var fourPlayerSheet = ss.getSheetByName("4 Player Season Rankings");
  if (fourPlayerSheet) {
    htmlParts.push(generateRankingTableHtml("four-player", "4 Player Season Rankings", fourPlayerSheet));
  }
  
  // Add 3 Player Rankings
  var threePlayerSheet = ss.getSheetByName("3 Player Season Rankings");
  if (threePlayerSheet) {
    htmlParts.push(generateRankingTableHtml("three-player", "3 Player Season Rankings", threePlayerSheet));
  }
  
  // Add Team Rankings
  var teamSheet = ss.getSheetByName("Team Rankings (4 Player)");
  if (teamSheet) {
    htmlParts.push(generateTeamRankingTableHtml(teamSheet));
  }
  
  // Add footer
  htmlParts.push(`
    <div class="update-time">
      Last updated: ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`);
  
  return htmlParts.join('\n');
}

function generateRankingTableHtml(id, title, sheet) {
  var data = sheet.getDataRange().getValues();
  var formulas = sheet.getDataRange().getFormulas(); // Get formulas to extract IMAGE URLs
  var html = [`<div id="${id}" class="ranking-section">
    <h2>${title}</h2>
    <table>
      <thead>
        <tr>`];
  
  // Add headers (skip title row)
  var headers = data[1];
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i] !== "Flag") {
      html.push(`<th>${headers[i]}</th>`);
    }
  }
  html.push('</tr></thead><tbody>');
  
  // Add data rows (skip title and header rows)
  for (var row = 2; row < data.length; row++) {
    if (!data[row][0]) continue; // Skip empty rows
    
    html.push('<tr>');
    for (var col = 0; col < data[row].length; col++) {
      if (headers[col] === "Flag") continue; // Skip flag column
      
      var cellValue = data[row][col];
      var cellClass = '';
      
      // Add special styling for top 3 ranks
      if (col === 0 && cellValue <= 3) {
        cellClass = ` class="rank-${cellValue}"`;
      }
      
      // Handle player name column (add flag image)
      if (headers[col] === "Player" && col > 0) {
        var flagFormula = formulas[row] && formulas[row][col-1] ? formulas[row][col-1] : ''; // Get formula from flag column
        var flagUrl = '';
        var countryCode = '';
        
        if (flagFormula && flagFormula.includes('IMAGE(')) {
          // Extract URL from IMAGE formula: =IMAGE("...us.png")
          var urlMatch = flagFormula.match(/IMAGE\("([^"]+)"/);
          if (urlMatch) {
            flagUrl = urlMatch[1];
          }
          // Also extract country code for fallback emoji
          var codeMatch = flagFormula.match(/\/([a-z]{2})\.png/i);
          if (codeMatch) {
            countryCode = codeMatch[1];
          }
        }
        
        if (flagUrl) {
          // Use actual flag image with emoji fallback
          var emoji = countryCode ? getCountryEmoji(countryCode) : '🏳️';
          cellValue = `<img src="${flagUrl}" alt="${emoji}" class="flag-image" onerror="this.style.display='none'; this.nextSibling.style.display='inline';"><span class="flag-emoji">${emoji}</span>${cellValue}`;
        }
      }
      
      // Format Score column to 1 decimal place
      if (headers[col] === "Score" && typeof cellValue === 'number') {
        cellValue = cellValue.toFixed(1);
      }
      
      // Add class for player name column
      if (headers[col] === "Player") {
        cellClass = cellClass ? cellClass.replace('class="', 'class="player-name ') : ' class="player-name"';
      }
      html.push(`<td${cellClass}>${cellValue || ''}</td>`);
    }
    html.push('</tr>');
  }
  
  html.push('</tbody></table></div>');
  return html.join('');
}

function generateTeamRankingTableHtml(sheet) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = sheet.getDataRange().getValues();
  
  // Get team logos from the Teams sheet
  var teamsSheet = ss.getSheetByName("Teams");
  var teamLogos = {};
  
  if (teamsSheet) {
    var teamsData = teamsSheet.getDataRange().getValues();
    // Build team logo map (skip header row)
    for (var i = 1; i < teamsData.length; i++) {
      var teamName = teamsData[i][1]; // Team Name column
      var logoUrl = teamsData[i][2];  // Logo URL column
      if (teamName && logoUrl) {
        teamLogos[teamName] = logoUrl;
      }
    }
  }
  
  var html = [`<div id="team-rankings" class="ranking-section">
    <h2>Team Rankings (4 Player)</h2>
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>Members</th>
          <th>Total Score</th>
        </tr>
      </thead>
      <tbody>`];
  
  // Process team data (skip title and header rows)
  for (var row = 2; row < data.length; row += 2) {
    if (!data[row][0]) continue; // Skip empty rows
    
    var rank = data[row][0];
    var teamName = data[row][1];
    var teamScore = data[row][3];
    var members = data[row+1] && data[row+1][2] ? data[row+1][2] : '';
    
    // Get logo URL from Teams sheet
    var logoHtml = '';
    if (teamLogos[teamName]) {
      logoHtml = `<img src="${teamLogos[teamName]}" class="team-logo" alt="" style="width:30px; height:30px; margin-right:10px; vertical-align:middle; border-radius:4px;">`;
    }
    
    var rankClass = rank <= 3 ? ` class="rank-${rank}"` : '';
    
    // Format team score to 1 decimal place
    var formattedScore = typeof teamScore === 'number' ? teamScore.toFixed(1) : teamScore;
    
    html.push(`
      <tr>
        <td${rankClass}>${rank}</td>
        <td class="team-name">${logoHtml}${teamName}</td>
        <td class="team-members">${members}</td>
        <td>${formattedScore}</td>
      </tr>
    `);
  }
  
  html.push('</tbody></table></div>');
  return html.join('');
}

// Create a sheet that displays HTML content as a webpage link
function createHtmlViewerSheet(htmlContent) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var viewerSheet = ss.getSheetByName("HTML Viewer");
  
  if (!viewerSheet) {
    viewerSheet = ss.insertSheet("HTML Viewer");
  }
  
  viewerSheet.clear();
  
  // Add title
  viewerSheet.getRange(1, 1).setValue("Mahjong Rankings HTML Export");
  viewerSheet.getRange(1, 1).setFontSize(18).setFontWeight("bold");
  
  // Instructions for viewing
  viewerSheet.getRange(3, 1).setValue("📋 HOW TO USE THIS HTML:");
  viewerSheet.getRange(3, 1).setFontSize(14).setFontWeight("bold");
  
  viewerSheet.getRange(4, 1).setValue("EASIEST: Use 'Preview Rankings in Browser' from the C2 Options menu");
  viewerSheet.getRange(5, 1).setValue("");
  viewerSheet.getRange(6, 1).setValue("TO UPDATE YOUR WEBSITE:");
  viewerSheet.getRange(7, 1).setValue("1. Copy ALL the HTML code below (Ctrl+A, Ctrl+C in the cell)");
  viewerSheet.getRange(8, 1).setValue("2. Open your website's HTML file in a text editor");
  viewerSheet.getRange(9, 1).setValue("3. Replace the entire contents with this HTML");
  viewerSheet.getRange(10, 1).setValue("4. Save and upload to your web host");
  
  // Add the HTML content
  viewerSheet.getRange(12, 1).setValue("📄 HTML CODE (Copy everything below):");
  viewerSheet.getRange(12, 1).setFontSize(14).setFontWeight("bold");
  
  viewerSheet.getRange(13, 1).setValue(htmlContent);
  
  // Also add alternative hosting options
  viewerSheet.getRange(15, 1).setValue("🌐 FREE HOSTING OPTIONS:");
  viewerSheet.getRange(15, 1).setFontSize(14).setFontWeight("bold");
  
  viewerSheet.getRange(16, 1).setValue("• GitHub Pages (free): Create repo, upload HTML as index.html");
  viewerSheet.getRange(17, 1).setValue("• Netlify Drop (free): Just drag and drop your HTML file at https://app.netlify.com/drop");
  viewerSheet.getRange(18, 1).setValue("• Google Sites: sites.google.com - Create site, use Embed > Embed code");
  
  // Format the sheet
  viewerSheet.setColumnWidth(1, 900);
  viewerSheet.setRowHeight(13, 500);
  viewerSheet.getRange(13, 1).setWrap(true);
  viewerSheet.getRange(13, 1).setVerticalAlignment("top");
  viewerSheet.getRange(13, 1).setFontFamily("Courier New");
  viewerSheet.getRange(13, 1).setFontSize(10);
  
  // Add borders
  viewerSheet.getRange(13, 1).setBorder(true, true, true, true, false, false);
}

// Alternative: Publish as Google Sites
function publishToGoogleSites() {
  var ui = SpreadsheetApp.getUi();
  var htmlContent = generateRankingsHtml();
  
  ui.alert(
    'Google Sites Instructions',
    'To publish rankings on Google Sites:\n\n' +
    '1. Go to sites.google.com\n' +
    '2. Create a new site or edit existing\n' +
    '3. Add an "Embed" component\n' +
    '4. Choose "Embed code"\n' +
    '5. Paste the HTML from the "HTML Viewer" sheet\n\n' +
    'The rankings will display perfectly on your Google Site!',
    ui.ButtonSet.OK
  );
  
  createHtmlViewerSheet(htmlContent);
}

// Function to preview rankings in a modal dialog
function previewRankingsInBrowser() {
  var htmlContent = generateRankingsHtml();
  
  // Create an HTML output from the content
  var htmlOutput = HtmlService.createHtmlOutput(htmlContent)
    .setWidth(1400)
    .setHeight(800)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Rankings Preview - Full Screen');
}

// Debug function to check team formulas
function debugTeamFormulas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var teamSheet = ss.getSheetByName("Team Rankings (4 Player)");
  
  if (!teamSheet) {
    SpreadsheetApp.getUi().alert('No Team Rankings sheet found! Run "Update Team Rankings" first.');
    return;
  }
  
  var data = teamSheet.getDataRange().getValues();
  var formulas = teamSheet.getDataRange().getFormulas();
  var debugInfo = [];
  
  debugInfo.push("Team Rankings Debug Info:");
  debugInfo.push("========================");
  
  for (var row = 2; row < data.length; row += 2) {
    if (!data[row][0]) continue;
    
    var rank = data[row][0];
    var teamName = data[row][1];
    var teamFormula = formulas[row] && formulas[row][1] ? formulas[row][1] : '';
    
    debugInfo.push("");
    debugInfo.push("Row " + (row + 1) + ":");
    debugInfo.push("  Rank: " + rank);
    debugInfo.push("  Team Name (display): " + teamName);
    debugInfo.push("  Team Formula: " + teamFormula);
    
    if (teamFormula && teamFormula.includes('IMAGE(')) {
      var logoMatch = teamFormula.match(/IMAGE\("([^"]+)"/);
      if (logoMatch) {
        debugInfo.push("  Found Logo URL: " + logoMatch[1]);
      }
    } else {
      debugInfo.push("  No IMAGE formula found");
    }
  }
  
  SpreadsheetApp.getUi().alert(debugInfo.join('\n'));
}