function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu('C2 Options')
    .addItem('Add Game & Calculate Rankings', 'showDialog')
    .addItem('Calculate Rankings', 'calculateRankings')
    .addItem('Settings', 'showSettingsDialog');

  var advancedMenu = ui.createMenu('Advanced')
    .addItem('Create debug info', 'createDebugInfo');

  // Conditionally add team-related items
  try {
    if (typeof isTeamModeEnabled === 'function' && isTeamModeEnabled()) {
      advancedMenu
        .addItem('Initialize Teams Sheet', 'initializeTeamsSheet')
        .addItem('Create Table Seating Plan', 'showSeatingPlanDialog');
    }
  } catch (e) {
    // If settings not available, skip conditional items
  }

  advancedMenu
    .addItem('Export Rankings to HTML', 'exportRankingsToHtml')
    .addItem('Preview Rankings in Browser', 'previewRankingsInBrowser')
    .addSeparator()
    .addItem('Visit the HTML export page', 'visitHtmlExportPage')
    .addSeparator()
    .addItem('Authorize External Access', 'authorizeScript')
    .addItem('Publish to Website (GitHub)', 'publishToGitHub')
    .addItem('Setup GitHub Publishing', 'showGitHubSetup')
    .addItem('Disable GitHub Publishing', 'disableGitHubPublishing');

  menu.addSubMenu(advancedMenu).addToUi();
}