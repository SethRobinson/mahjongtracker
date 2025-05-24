function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('C2 Options')
    .addItem('Add Game & Calculate Rankings', 'showDialog')
    .addSeparator()
    .addItem('Create debug info', 'createDebugInfo')
    .addItem('Calculate Rankings Manually', 'calculateRankings')
    .addItem('Initialize Teams Sheet', 'initializeTeamsSheet')
    .addItem('Update Team Rankings', 'updateTeamRankings')
    .addItem('Export Rankings to HTML', 'exportRankingsToHtml')
    .addItem('Preview Rankings in Browser', 'previewRankingsInBrowser')
    .addSeparator()
    .addItem('Visit the HTML export page', 'visitHtmlExportPage')
    .addSeparator()
    .addItem('Authorize External Access', 'authorizeScript')
    .addItem('Publish to Website (GitHub)', 'publishToGitHub')
    .addItem('Setup GitHub Publishing', 'showGitHubSetup')
    .addToUi();
}