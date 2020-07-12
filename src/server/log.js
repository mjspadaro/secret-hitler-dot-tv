const LOG_SEVERITY = {
  // LOG LEVELS FROM GOOGLE CLOUD
  DEFAULT: 0, // DEFAULT	(0) The log entry has no assigned severity level.
  DEBUG: 100,  // DEBUG	(100) Debug or trace information.
  INFO: 200,  // INFO	(200) Routine information, such as ongoing status or performance.
  NOTICE: 300,  // NOTICE	(300) Normal but significant events, such as start up, shut down, or a configuration change.
  WARNING: 400,  // WARNING	(400) Warning events might cause problems.
  ERROR: 500,  // ERROR	(500) Error events are likely to cause problems.
  CRITICAL: 600,  // CRITICAL	(600) Critical events cause more severe problems or outages.
  ALERT: 700,  // ALERT	(700) A person must take an action immediately.
  EMERGENCY: 800  // EMERGENCY	(800) One or more systems are unusable.
}

const QUIET_MODE = process.argv.includes('--quiet');

const create = (message = '', payload = '', severity = LOG_SEVERITY.DEFAULT) => {
  return { message, severity, ...payload };
}

const output = (log) => {
  if (QUIET_MODE)
    return;
  const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
  if (isDevelopmentEnvironment)
    outputDevelopmentLog(log);
  else 
    outputProductionLog(log);
}

const outputProductionLog = (log) => console.log(JSON.stringify(log));
const outputDevelopmentLog = (log) => getConsoleLogger(log)({
  message: log.message,
  severity: log.severity,
  payload: log });

const getConsoleLogger = (log) => {
  if (log.severity >= LOG_SEVERITY.ERROR)
    return console.error
  if (log.severity >= LOG_SEVERITY.WARNING)
    return console.warn
  if (log.severity >= LOG_SEVERITY.NOTICE)
    return console.info
  return console.log
}

const createAndOutput = (message, payload, severity) => output(create(message, payload, severity));

const info = (message, payload) => createAndOutput(message, payload, LOG_SEVERITY.INFO);
const notice = (message, payload) => createAndOutput(message, payload, LOG_SEVERITY.NOTICE);
const warning = (message, payload) => createAndOutput(message, payload, LOG_SEVERITY.WARNING);
const error = (message, payload) => createAndOutput(message, payload, LOG_SEVERITY.ERROR);

module.exports = {
  info,
  notice,
  warning,
  error
}