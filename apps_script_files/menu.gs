function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('C2 Options')
    .addItem('Add Game & Calculate Rankings', 'showDialog')
    .addSeparator()
    .addItem('Create debug info', 'createDebugInfo')
    .addItem('Calculate Rankings Manually', 'calculateRankings')
    .addItem('Initialize Teams Sheet', 'initializeTeamsSheet')
    .addItem('Export Rankings to HTML', 'exportRankingsToHtml')
    .addItem('Preview Rankings in Browser', 'previewRankingsInBrowser')
    .addItem('Create Table Seating Plan', 'showSeatingPlanDialog')
    .addSeparator()
    .addItem('Visit the HTML export page', 'visitHtmlExportPage')
    .addSeparator()
    .addItem('Authorize External Access', 'authorizeScript')
    .addItem('Publish to Website (GitHub)', 'publishToGitHub')
    .addItem('Setup GitHub Publishing', 'showGitHubSetup')
    .addItem('Disable GitHub Publishing', 'disableGitHubPublishing')
    .addToUi();
}