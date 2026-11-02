// The immutable oracle was captured in Europe/Minsk. Intl's default time zone
// also selects currency and regional support text, independently of the clock.
// Node runs test files in separate processes; only the two frozen suites import
// this setup. Production and comparative tests retain their host environment.
process.env.TZ = 'Europe/Minsk';
