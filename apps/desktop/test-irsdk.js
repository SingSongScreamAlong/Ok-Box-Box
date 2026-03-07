const { IRacingSDK } = require('irsdk-node');

const ir = new IRacingSDK();
ir.startSDK();

async function poll() {
  const ready = await ir.ready();
  console.log('Ready:', ready);
  
  if (!ready) {
    console.log('iRacing not running');
    process.exit(1);
  }
  
  // Try multiple times with waitForData
  let hasData = false;
  for (let i = 0; i < 10; i++) {
    console.log(`Waiting for data (attempt ${i + 1})...`);
    hasData = ir.waitForData(500);
    console.log('Has data:', hasData);
    if (hasData) break;
    await new Promise(r => setTimeout(r, 100));
  }
  
  if (!hasData) {
    console.log('No data frames available');
    process.exit(1);
  }
  
  console.log('Getting telemetry...');
  const t = ir.getTelemetry();
  console.log('Telemetry type:', typeof t);
  if (t) {
    console.log('Keys:', Object.keys(t).length);
    console.log('Speed:', t.Speed);
    console.log('RPM:', t.RPM);
  }
  
  console.log('Getting session...');
  const session = ir.getSessionData();
  if (session) {
    console.log('Track:', session.WeekendInfo?.TrackDisplayName);
  }
  
  console.log('Done');
  process.exit(0);
}

setTimeout(poll, 2000);
