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
        //console.log('Downloading JDK from: ', url())
        /*downloader.download(progressBar, url(), './openjdk_' + version + '.zip', (err) => {
            // Check for error
            if (err)
                callback(err)
            // Download complete, unzip archive
            const zip = new StreamZip({
                file: ('./openjdk_' + version + '.zip'),
                storeEntries: true
            })
            
            // Extract everything
            zip.on('ready', () => {
                if (!fs.existsSync('.temp'))
                    fs.mkdirSync('.temp')
                zip.extract(null, './.temp', (err, count) => {
                    //console.log(err ? 'Extract error' : `Extracted ${count} entries`);
                    zip.close();
                })
            })
        })*/
        // Download OpenJFX 13
        console.log('Downloading JFX from: ', urlFX())
        handler.download(progressBar, urlFX(), './openjfx_' + version + '.zip')
            .then(
                (res) => {
                    // Download complete, unzip archive
                    const zip = new StreamZip({
                        file: ('./openjfx_' + version + '.zip'),
                        storeEntries: true
                    })
                        
                    // Extract everything
                    zip.on('ready', () => {
                        if (!fs.existsSync('.temp'))
                            fs.mkdirSync('.temp')
                        zip.extract(null, './.temp', (err, count) => {
                            //console.log(err ? 'Extract error' : `Extracted ${count} entries`);
                            zip.close();
                        })
                    })
                }, (err) => {
                    console.log("Error: ", err.message)
                    callback(err)
                }
            )
        /*downloader.download(progressBar, urlFX(), './openjfx_' + version + '.zip', (err) => {
            // Check for error
            if (err)
                callback(err)
            // Download complete, unzip archive
            const zip = new StreamZip({
                file: ('./openjfx_' + version + '.zip'),
                storeEntries: true
            })
                
            // Extract everything
            zip.on('ready', () => {
                if (!fs.existsSync('.temp'))
                    fs.mkdirSync('.temp')
                zip.extract(null, './.temp', (err, count) => {
                    //console.log(err ? 'Extract error' : `Extracted ${count} entries`);
                    zip.close();
                })
            })
        })*/
    }
})()

