// Authorization helper function
function authorizeScript() {
  var ui = SpreadsheetApp.getUi();
  
  ui.alert(
    'Authorizing Script',
    'This will trigger Google\'s permission dialog.\n\n' +
    'After clicking OK:\n' +
    '1. You may see "This app isn\'t verified"\n' +
    '2. Click "Advanced" → "Go to [Project] (unsafe)"\n' +
    '3. Click "Allow" to grant permissions\n\n' +
    'This is required for GitHub publishing to work.',
    ui.ButtonSet.OK
  );
  
  try {
    // Trigger authorization
    UrlFetchApp.fetch('https://api.github.com');
    ui.alert('Success!', 'External access is already authorized. You can now use GitHub publishing!', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert(
      'Authorization Needed',
      'Please follow the authorization prompts that should appear.\n\n' +
      'If no prompt appears:\n' +
      '1. Refresh this Google Sheets page\n' +
      '2. Run this menu item again',
      ui.ButtonSet.OK
    );
  }
}

// Auto-publish function (silent, no popups)
function autoPublishToGitHub() {
  try {
    // Check if GitHub is configured
    var properties = PropertiesService.getScriptProperties();
    var token = properties.getProperty('GITHUB_TOKEN');
    var owner = properties.getProperty('GITHUB_OWNER');
    var repo = properties.getProperty('GITHUB_REPO');
    
    // If not configured, silently skip
    if (!token || !owner || !repo) {
      return;
    }
    
    // Call the main publish function with silent flag
    publishToGitHubInternal(false);
  } catch (error) {
    // Silently fail for auto-publish
    console.error('Auto-publish to GitHub failed:', error);
  }
}

// GitHub Publishing Functions
function publishToGitHub() {
  publishToGitHubInternal(true);
}

function publishToGitHubInternal(showAlert) {
  var ui = SpreadsheetApp.getUi();
  
  try {
    // Check if GitHub is configured
    var properties = PropertiesService.getScriptProperties();
    var token = properties.getProperty('GITHUB_TOKEN');
    var owner = properties.getProperty('GITHUB_OWNER');
    var repo = properties.getProperty('GITHUB_REPO');
    
    if (!token || !owner || !repo) {
      if (showAlert) {
        ui.alert(
          'GitHub Not Configured',
          'Please run "Setup GitHub Publishing" first to configure your GitHub repository settings.',
          ui.ButtonSet.OK
        );
      }
      return;
    }
    
    // Generate HTML content
    var htmlContent = generateRankingsHtml();
    
    // Get current file SHA if it exists (required for updates)
    var sha = getCurrentFileSha(token, owner, repo, 'index.html');
    
    // Add UTF-8 BOM to ensure proper encoding detection
    var utf8BOM = "\ufeff";
    var htmlWithBOM = utf8BOM + htmlContent;
    
    // Prepare the API payload - encode UTF-8 properly
    var payload = {
      "message": "Update Mahjong rankings - " + new Date().toLocaleString(),
      "content": Utilities.base64Encode(Utilities.newBlob(htmlWithBOM).getBytes()),
      "committer": {
        "name": "Mahjong Rankings Bot",
        "email": "noreply@mahjong-rankings.com"
      }
    };
    
    // Add SHA if file exists (for updates)
    if (sha) {
      payload.sha = sha;
    }
    
    // Make the API call to GitHub
    var url = `https://api.github.com/repos/${owner}/${repo}/contents/index.html`;
    var options = {
      "method": "PUT",
      "headers": {
        "Authorization": "token " + token,
        "Content-Type": "application/json",
        "User-Agent": "Mahjong-Rankings-Apps-Script"
      },
      "payload": JSON.stringify(payload)
    };
    
    var response = UrlFetchApp.fetch(url, options);
    var responseCode = response.getResponseCode();
    
    if (responseCode === 200 || responseCode === 201) {
      // Also create/update .nojekyll file to ensure proper serving
      createNoJekyllFile(token, owner, repo);
      
      var websiteUrl = `https://${owner}.github.io/${repo}`;
      // Only show alert if called manually (not from auto-publish)
      if (showAlert) {
        ui.alert(
          'Successfully Published!',
          `Rankings have been published to your website:\n\n${websiteUrl}\n\n` +
          'Note: It may take 1-2 minutes for changes to appear on the live site.',
          ui.ButtonSet.OK
        );
      }
    } else {
      var errorData = JSON.parse(response.getContentText());
      throw new Error(`GitHub API Error (${responseCode}): ${errorData.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    if (showAlert) {
      ui.alert(
        'Publishing Failed',
        `Error publishing to GitHub: ${error.toString()}\n\n` +
        'Please check your GitHub settings and try again.',
        ui.ButtonSet.OK
      );
    }
    console.error('GitHub publishing error:', error);
  }
}

function getCurrentFileSha(token, owner, repo, filename) {
  try {
    var url = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    var options = {
      "method": "GET",
      "headers": {
        "Authorization": "token " + token,
        "User-Agent": "Mahjong-Rankings-Apps-Script"
      }
    };
    
    var response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() === 200) {
      var data = JSON.parse(response.getContentText());
      return data.sha;
    }
    
    return null; // File doesn't exist yet
  } catch (error) {
    return null; // File doesn't exist or other error
  }
}

function showGitHubSetup() {
  var ui = SpreadsheetApp.getUi();
  
  // Force authorization first
  try {
    // Make a test request to trigger authorization
    UrlFetchApp.fetch('https://api.github.com');
  } catch (e) {
    if (e.toString().includes('permission')) {
      ui.alert(
        'Authorization Required',
        'This script needs permission to access external websites.\n\n' +
        '1. Close this dialog\n' +
        '2. You should see a permission prompt\n' +
        '3. Click "Continue" and "Allow"\n' +
        '4. Then run this setup again\n\n' +
        'If no prompt appears, try refreshing the page.',
        ui.ButtonSet.OK
      );
      return;
    }
  }
  
  // Check current settings
  var properties = PropertiesService.getScriptProperties();
  var currentOwner = properties.getProperty('GITHUB_OWNER') || 'not set';
  var currentRepo = properties.getProperty('GITHUB_REPO') || 'not set';
  var hasToken = properties.getProperty('GITHUB_TOKEN') ? 'configured' : 'not set';
  
  var message = `GITHUB PAGES SETUP INSTRUCTIONS\n\n` +
    `Current Settings:\n` +
    `• GitHub Username: ${currentOwner}\n` +
    `• Repository Name: ${currentRepo}\n` +
    `• Access Token: ${hasToken}\n\n` +
    
    `STEP-BY-STEP SETUP:\n\n` +
    
    `1. CREATE GITHUB REPOSITORY\n` +
    `   • Go to github.com and create account (if needed)\n` +
    `   • Click "New repository" (green button)\n` +
    `   • Name: "mahjong-rankings" (or your choice)\n` +
    `   • Make it PUBLIC (required for free GitHub Pages)\n` +
    `   • Check "Add a README file"\n` +
    `   • Click "Create repository"\n\n` +
    
    `2. ENABLE GITHUB PAGES\n` +
    `   • In your new repository, click "Settings" tab\n` +
    `   • Scroll down to "Pages" in left sidebar\n` +
    `   • Under "Source", select "Deploy from a branch"\n` +
    `   • Select "main" branch and "/ (root)"\n` +
    `   • Click "Save"\n\n` +
    
    `3. CREATE ACCESS TOKEN\n` +
    `   • Go to GitHub Settings > Developer settings\n` +
    `   • Click "Personal access tokens" > "Fine-grained tokens"\n` +
    `   • Click "Generate new token"\n` +
    `   • Repository access: "Selected repositories"\n` +
    `   • Choose your mahjong-rankings repository\n` +
    `   • Repository permissions: Contents = "Read and write"\n` +
    `   • Generate token and COPY IT (you won't see it again!)\n\n` +
    
    `4. CONFIGURE THIS SCRIPT\n` +
    `   • Click OK, then run "Setup GitHub Configuration"\n` +
    `   • Enter your GitHub username\n` +
    `   • Enter your repository name\n` +
    `   • Paste your access token\n\n` +
    
    `5. TEST PUBLISHING\n` +
    `   • Use "Publish to Website (GitHub)" from menu\n` +
    `   • Your site will be live at:\n` +
    `   • https://[username].github.io/[repository-name]\n\n` +
    
    `Need help? The setup guide will be created in your spreadsheet.`;
  
  var result = ui.alert(
    'GitHub Pages Setup',
    message,
    ui.ButtonSet.OK_CANCEL
  );
  
  if (result === ui.Button.OK) {
    setupGitHubConfiguration();
    createGitHubSetupGuide();
  }
}

function setupGitHubConfiguration() {
  var ui = SpreadsheetApp.getUi();
  
  // Get GitHub username
  var ownerResponse = ui.prompt(
    'GitHub Configuration - Step 1/3',
    'Enter your GitHub username:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (ownerResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  var owner = ownerResponse.getResponseText().trim();
  if (!owner) {
    ui.alert('Error', 'GitHub username cannot be empty.', ui.ButtonSet.OK);
    return;
  }
  
  // Get repository name
  var repoResponse = ui.prompt(
    'GitHub Configuration - Step 2/3',
    'Enter your repository name (e.g., "mahjong-rankings"):',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (repoResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  var repo = repoResponse.getResponseText().trim();
  if (!repo) {
    ui.alert('Error', 'Repository name cannot be empty.', ui.ButtonSet.OK);
    return;
  }
  
  // Get access token
  var tokenResponse = ui.prompt(
    'GitHub Configuration - Step 3/3',
    'Enter your GitHub fine-grained personal access token:',
    ui.ButtonSet.OK_CANCEL
  );
  
  if (tokenResponse.getSelectedButton() !== ui.Button.OK) {
    return;
  }
  
  var token = tokenResponse.getResponseText().trim();
  if (!token) {
    ui.alert('Error', 'Access token cannot be empty.', ui.ButtonSet.OK);
    return;
  }
  
  // Test the configuration
  try {
    var testUrl = `https://api.github.com/repos/${owner}/${repo}`;
    var testOptions = {
      "method": "GET",
      "headers": {
        "Authorization": "token " + token,
        "User-Agent": "Mahjong-Rankings-Apps-Script"
      }
    };
    
    var testResponse = UrlFetchApp.fetch(testUrl, testOptions);
    
    if (testResponse.getResponseCode() !== 200) {
      throw new Error(`Repository not found or access denied (${testResponse.getResponseCode()})`);
    }
    
    // Save the configuration
    var properties = PropertiesService.getScriptProperties();
    properties.setProperties({
      'GITHUB_OWNER': owner,
      'GITHUB_REPO': repo,
      'GITHUB_TOKEN': token
    });
    
    var websiteUrl = `https://${owner}.github.io/${repo}`;
    ui.alert(
      'Configuration Saved!',
      `GitHub publishing is now configured.\n\n` +
      `Repository: ${owner}/${repo}\n` +
      `Website URL: ${websiteUrl}\n\n` +
      `You can now use "Publish to Website (GitHub)" to update your rankings!`,
      ui.ButtonSet.OK
    );
    
  } catch (error) {
    ui.alert(
      'Configuration Test Failed',
      `Could not access GitHub repository: ${error.toString()}\n\n` +
      'Please check:\n' +
      '• Repository exists and is public\n' +
      '• Access token has correct permissions\n' +
      '• Username and repository name are correct',
      ui.ButtonSet.OK
    );
  }
}

function createNoJekyllFile(token, owner, repo) {
  try {
    // Check if .nojekyll exists
    var sha = getCurrentFileSha(token, owner, repo, '.nojekyll');
    
    // If file already exists, skip creating it
    if (sha) {
      console.log('.nojekyll file already exists, skipping creation');
      // Still check for _config.yml but don't update .nojekyll
      createConfigFile(token, owner, repo);
      return;
    }
    
    var payload = {
      "message": "Add .nojekyll file for proper GitHub Pages serving",
      "content": Utilities.base64Encode(Utilities.newBlob("").getBytes()), // Empty file
      "committer": {
        "name": "Mahjong Rankings Bot",
        "email": "noreply@mahjong-rankings.com"
      }
    };
    
    var url = `https://api.github.com/repos/${owner}/${repo}/contents/.nojekyll`;
    var options = {
      "method": "PUT",
      "headers": {
        "Authorization": "token " + token,
        "Content-Type": "application/json",
        "User-Agent": "Mahjong-Rankings-Apps-Script"
      },
      "payload": JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(url, options);
    console.log('.nojekyll file created successfully');
    
    // Also create _config.yml to ensure proper encoding
    createConfigFile(token, owner, repo);
    
  } catch (error) {
    // Silently fail - not critical
    console.log('Could not create .nojekyll file:', error);
  }
}

function createConfigFile(token, owner, repo) {
  try {
    // Check if _config.yml already exists
    var sha = getCurrentFileSha(token, owner, repo, '_config.yml');
    
    // If file already exists, skip creating it
    if (sha) {
      console.log('_config.yml file already exists, skipping creation');
      return;
    }
    
    var configContent = `# GitHub Pages configuration
encoding: UTF-8
highlighter: rouge
markdown: kramdown
kramdown:
  input: GFM
  hard_wrap: false
`;
    
    var payload = {
      "message": "Add _config.yml for UTF-8 encoding",
      "content": Utilities.base64Encode(Utilities.newBlob(configContent).getBytes()),
      "committer": {
        "name": "Mahjong Rankings Bot",
        "email": "noreply@mahjong-rankings.com"
      }
    };
    
    var url = `https://api.github.com/repos/${owner}/${repo}/contents/_config.yml`;
    var options = {
      "method": "PUT",
      "headers": {
        "Authorization": "token " + token,
        "Content-Type": "application/json",
        "User-Agent": "Mahjong-Rankings-Apps-Script"
      },
      "payload": JSON.stringify(payload)
    };
    
    UrlFetchApp.fetch(url, options);
    console.log('_config.yml file created successfully');
    
  } catch (error) {
    // Silently fail - not critical
    console.log('Could not create _config.yml file:', error);
  }
}

function visitHtmlExportPage() {
  var properties = PropertiesService.getScriptProperties();
  var owner = properties.getProperty('GITHUB_OWNER');
  var repo = properties.getProperty('GITHUB_REPO');
  
  if (!owner || !repo) {
    SpreadsheetApp.getUi().alert(
      'GitHub Not Configured',
      'Please run "Setup GitHub Publishing" first to configure your GitHub repository settings.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }
  
  var websiteUrl = `https://${owner}.github.io/${repo}`;
  var htmlService = HtmlService.createHtmlOutput(`
    <script>
      window.open('${websiteUrl}', '_blank');
      google.script.host.close();
    </script>
  `);
  
  SpreadsheetApp.getUi().showModalDialog(htmlService, 'Opening Website...');
}

function createGitHubSetupGuide() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var guideSheet = ss.getSheetByName("GitHub Setup Guide");
  
  if (!guideSheet) {
    guideSheet = ss.insertSheet("GitHub Setup Guide");
  }
  
  guideSheet.clear();
  
  // Title
  guideSheet.getRange(1, 1).setValue("GitHub Pages Setup Guide");
  guideSheet.getRange(1, 1).setFontSize(18).setFontWeight("bold");
  
  var instructions = [
    "",
    "🚀 COMPLETE GITHUB PAGES SETUP GUIDE",
    "",
    "STEP 1: CREATE GITHUB ACCOUNT & REPOSITORY",
    "1. Go to github.com and create a free account (if you don't have one)",
    "2. Click the green 'New repository' button",
    "3. Repository name: 'mahjong-rankings' (or your preferred name)",
    "4. Description: 'Mahjong tournament rankings website'",
    "5. Make sure it's set to PUBLIC (required for free GitHub Pages)",
    "6. Check 'Add a README file'",
    "7. Click 'Create repository'",
    "",
    "STEP 2: ENABLE GITHUB PAGES",
    "1. In your new repository, click the 'Settings' tab",
    "2. Scroll down and click 'Pages' in the left sidebar",
    "3. Under 'Source', select 'Deploy from a branch'",
    "4. Choose 'main' branch and '/ (root)' folder",
    "5. Click 'Save'",
    "6. GitHub will show your site URL: https://[username].github.io/[repo-name]",
    "",
    "STEP 3: CREATE FINE-GRAINED ACCESS TOKEN",
    "1. Go to GitHub Settings (click your profile picture > Settings)",
    "2. Scroll down to 'Developer settings' in left sidebar",
    "3. Click 'Personal access tokens' > 'Fine-grained tokens'",
    "4. Click 'Generate new token'",
    "5. Token name: 'Mahjong Rankings Publisher'",
    "6. Expiration: Choose your preference (90 days recommended)",
    "7. Repository access: 'Selected repositories'",
    "8. Select your mahjong-rankings repository",
    "9. Repository permissions:",
    "   - Contents: Read and write",
    "   - Metadata: Read",
    "   - All others: No access",
    "10. Click 'Generate token'",
    "11. IMPORTANT: Copy the token immediately! You won't see it again.",
    "",
    "STEP 4: CONFIGURE THIS SPREADSHEET",
    "1. Go to C2 Options menu > 'Setup GitHub Publishing'",
    "2. Enter your GitHub username",
    "3. Enter your repository name",
    "4. Paste your access token",
    "5. Click through the prompts to save",
    "",
    "STEP 5: PUBLISH YOUR RANKINGS",
    "1. Calculate your rankings first (C2 Options > Calculate Rankings)",
    "2. Go to C2 Options menu > 'Publish to Website (GitHub)'",
    "3. Wait for the success message",
    "4. Visit your website: https://[username].github.io/[repo-name]",
    "5. Bookmark the URL - this is your permanent rankings website!",
    "",
    "🔒 SECURITY NOTES:",
    "• Your token only has access to the ONE repository you specified",
    "• Your other GitHub repositories are completely protected",
    "• The token can only modify files, not repository settings",
    "• You can revoke the token anytime in GitHub Settings",
    "",
    "🔄 UPDATING RANKINGS:",
    "• Run 'Publish to Website (GitHub)' anytime to update",
    "• Changes appear on your website within 1-2 minutes",
    "• Your URL never changes - always the same link",
    "",
    "❓ TROUBLESHOOTING:",
    "• Repository not found: Check spelling of username/repo name",
    "• Access denied: Verify token permissions and repository is public",
    "• Site not loading: Wait a few minutes after first publish",
    "• Need help: Check GitHub Pages documentation",
    "",
    "✅ WHEN COMPLETE:",
    "Your mahjong rankings will be live on the internet at:",
    "https://[your-username].github.io/[your-repo-name]",
    "",
    "Share this URL with players - they can bookmark it and check",
    "rankings anytime from any device!"
  ];
  
  // Add instructions
  for (var i = 0; i < instructions.length; i++) {
    var row = i + 2;
    guideSheet.getRange(row, 1).setValue(instructions[i]);
    
    // Format headers
    if (instructions[i].startsWith("STEP") || instructions[i].startsWith("🚀") || 
        instructions[i].startsWith("🔒") || instructions[i].startsWith("🔄") || 
        instructions[i].startsWith("❓") || instructions[i].startsWith("✅")) {
      guideSheet.getRange(row, 1).setFontWeight("bold").setFontSize(12);
    }
  }
  
  // Format the sheet
  guideSheet.setColumnWidth(1, 800);
  guideSheet.getRange(2, 1, instructions.length, 1).setWrap(true);
  
  SpreadsheetApp.getUi().alert(
    'Setup Guide Created',
    'A detailed setup guide has been created in the "GitHub Setup Guide" sheet. ' +
    'Follow the steps there to set up your website.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}