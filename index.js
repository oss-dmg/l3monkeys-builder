// Dependencies
const os = require('os')
const fs = require('fs')
const request = require('request')
const StreamZip = require("node-stream-zip")
// Internal reusable Downloader
const downloader = require('./downloader')

//Constants, not dynamic, needs pretty often a hot patch
const major_version = '13'
const update_number = '0.1'
const build_number = '9'
const hash = 'cec27d702aa74d5a8630c65ae61e4305'
const version = major_version + '.' + update_number

// Failer, like Logger.fail(messahe)
const fail = reason => {
    console.error(reason);
    process.exit(1);
};
// Arch selector
let _arch = os.arch();
switch (_arch) {
    case 'x64': 
        break
    case 'ia32': 
        _arch = 'i586'
        break
    default:
        fail('unsupported architecture: ' + _arch)
}
const arch = exports.arch = () => _arch
// Platform selector
let _platform = os.platform();
let _driver
  switch (_platform) {
    case 'darwin': 
        _platform = 'macosx'
        _driver = ['Contents', 'Home', 'bin', 'java']
        break;
    case 'win32': 
        _platform = 'windows'
        _driver = ['bin', 'javaw.exe']
        break
    case 'linux': 
        _driver = ['bin', 'java'];
        break
    default:
      fail('unsupported platform: ' + _platform);
}
const platform = exports.platform = () => _platform
// URL creator
const url = exports.url = () =>
    'https://download.oracle.com/otn-pub/java/jdk/' +
        version + '+' + build_number + '/' + 
        hash +
        '/jdk-' + version + '_' + platform() + '-' + arch() + '_bin' + (
            platform() === 'windows' ? '.zip' : '.tar.gz'
        )

// Log created url
console.log('[Debug] Created url: ' + url())


// Download OpenJDK 13
downloader.download(url(), './openjdk_13.0.1.zip', (err) => {
    // Check for error
    if (err)
        fail(err)
    // Download complete, unzip archive
    const zip = new StreamZip({
        file: 'openjdk_13.0.1.zip',
        storeEntries: true
    })
    
    // Extract everything
    zip.on('ready', () => {
        fs.mkdirSync('.temp')
        zip.extract(null, './.temp', (err, count) => {
            console.log(err ? 'Extract error' : `Extracted ${count} entries`);
            zip.close();
        })
    })
})

