/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Benny Nystroem. All rights reserved.
 *  Licensed under the GNU GENERAL PUBLIC LICENSE v3 License. 
 *  See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Function
(function(){
    // Dependencies
    const os = require('os')
    const fs = require('fs')
    const process = require('process')
    const StreamZip = require("node-stream-zip")
    const _cliProgress = require('cli-progress')
    // Internal reusable Downloader
    const handler = require('./handler')
    // Progressbar - MultiBar
    const progressBar = new _cliProgress.MultiBar({
        format: '>> [{bar}] {percentage}%',
        clearOnComplete: false,
        hideCursor: true,
        stream: process.stdout,
    }, _cliProgress.Presets.legacy)

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
    // URL JavaFX creator
    const urlFX = exports.urlFX = () =>
        'https://download2.gluonhq.com/openjfx/' + 
            version + '/' +
            'openjfx-' + version + '_' + platform() + '-' + arch() + '_bin-jmods.zip'//'13.0.1/openjfx-13.0.1_linux-x64_bin-jmods.zip'


    const install = exports.install = callback => {
        // Download OpenJDK 13
        console.log('Downloading JDK from: ', url())
        // Download OpenJFX 13
        console.log('Downloading JFX from: ', urlFX())
        let dwlds = [handler.download(progressBar, url(), './openjdk_' + version + '.zip'),
                     handler.download(progressBar, urlFX(), './openjfx_' + version + '.zip')]

        // Reflect Promises
        const reflect = p => p.then(v => ({v, status: 'completed' }),
                                    e => ({e, status: 'rejected' }))

        // Wait for all Promises
        Promise.all(dwlds.map(reflect)).then((res) => {
            let stepComplete = res.filter(x => x.status === 'completed')
            if (!Array.isArray(stepComplete))
                return callback("Abort, recieved invalid objects!")
            if (stepComplete.length <= 0)
                return callback("Abort, none of the required files were downloaded!")
            // The length of `stepComplete` is here >= 1
            progressBar.stop() // Stop the whole MultiBar
            // Create an empty line as wrapper
            console.log(" ")
            // forEach completed download, start the unzipper
            stepComplete.forEach(item => {
                // Download complete, unzip archive
                const zip = new StreamZip({
                    file: item.v,
                    storeEntries: true
                })
                // Extract everything
                zip.on('ready', () => {
                    if (!fs.existsSync('.temp'))
                        fs.mkdirSync('.temp')
                    zip.extract(null, './.temp', (err, count) => {
                        console.log(err ? 'Extract error' : `Extracted ${count} entries`);
                        zip.close();
                    })
                })
            })
        })
    }

})()