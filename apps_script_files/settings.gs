// Settings management

function isTeamModeEnabled() {
  var props = PropertiesService.getDocumentProperties();
  return props.getProperty('ENABLE_TEAM_MODE') === 'true';
}

function getAppSettings() {
  var props = PropertiesService.getDocumentProperties();
  var enableTeamMode = props.getProperty('ENABLE_TEAM_MODE') === 'true';
  var timezone = props.getProperty('TIMEZONE') || SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Tokyo';
  var cutoffStr = props.getProperty('DAY_CUTOFF_HOUR');
  var dayCutoffHour = parseInt(cutoffStr, 10);
  if (isNaN(dayCutoffHour) || dayCutoffHour < 0 || dayCutoffHour > 23) {
    dayCutoffHour = 6;
  }
  return { enableTeamMode: enableTeamMode, timezone: timezone, dayCutoffHour: dayCutoffHour };
}

function saveAppSettings(settings) {
  var props = PropertiesService.getDocumentProperties();
  var enableTeamMode = settings && settings.enableTeamMode === true;
  props.setProperty('ENABLE_TEAM_MODE', enableTeamMode ? 'true' : 'false');

  // Timezone
  var tz = settings && settings.timezone ? String(settings.timezone).trim() : '';
  if (!tz) {
    tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Tokyo';
  }
  props.setProperty('TIMEZONE', tz);

  // Day cutoff hour (0-23)
  var cutoff = parseInt(settings && settings.dayCutoffHour, 10);
  if (isNaN(cutoff) || cutoff < 0 || cutoff > 23) {
    cutoff = 6;
  }
  props.setProperty('DAY_CUTOFF_HOUR', String(cutoff));

  try {
    // Rebuild menu to reflect new setting immediately
    onOpen();
  } catch (e) {
    // Ignore if onOpen not available for some reason
  }
  return { success: true };
}

function showSettingsDialog() {
  var html = HtmlService.createHtmlOutputFromFile('settingsDialog')
      .setWidth(380)
      .setHeight(260);
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings');
}

function getConfiguredTimeZone() {
  var props = PropertiesService.getDocumentProperties();
  return props.getProperty('TIMEZONE') || SpreadsheetApp.getActive().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Asia/Tokyo';
}

function getDayCutoffHour() {
  var props = PropertiesService.getDocumentProperties();
  var cutoffStr = props.getProperty('DAY_CUTOFF_HOUR');
  var cutoff = parseInt(cutoffStr, 10);
  if (isNaN(cutoff) || cutoff < 0 || cutoff > 23) {
    cutoff = 6;
  }
  return cutoff;
}


