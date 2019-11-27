/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Benny Nystroem. All rights reserved.
 *  Licensed under the GNU GENERAL PUBLIC LICENSE v3 License. 
 *  See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Function
(function(){
    // Dependencies
    const os = require('os')
    const path = require("path")
    const process = require('process')
    const _cliProgress = require('cli-progress')
    // Internal reusable Downloader
    const handler = require('./handler')
    // Progressbar - MultiBar
    const progressBar = new _cliProgress.MultiBar({
        format: '>> {filename} [{bar}] {percentage}%',
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

    const mvn_major_version = '3'
    const mvn_minor_version = '6'
    const mvn_patch_version = '3'
    const mvn_version = mvn_major_version + '.' + mvn_minor_version + '.' + mvn_patch_version

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
    // URL Maven creator
    const urlMVN = exports.urlMVN = () =>
        `https://www-us.apache.org/dist/maven/` +
            `maven-${mvn_major_version}/${mvn_version}/binaries/apache-maven-${mvn_version}-bin` + (
                platform() === 'windows' ? '.zip' : '.tar.gz'
            )


    const install = exports.install = callback => {
        // Download OpenJDK 13
        // console.log('Downloading JDK from: ', url())
        // Download OpenJFX 13
        // console.log('Downloading JFX from: ', urlFX())
        console.log('Fetching prerequisites...')
        let dwlds = [handler.download(progressBar, url(), `./openjdk_${version}`+(platform()==='windows'?'.zip':'.tar.gz')),
                     handler.download(progressBar, urlFX(), `./openjfx_${version}`+(platform()==='windows'?'.zip':'.tar.gz')),
                     handler.download(progressBar, urlMVN(), `./maven_${mvn_version}`+(platform()==='windows'?'.zip':'.tar.gz'))
                    ]

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
            if (stepComplete.length < dwlds.length)
                return callback("Some prerequisites could not be fetched! Aborting...")
            // The length of `stepComplete` is here >= 1
            progressBar.stop() // Stop the whole MultiBar
            // Create an empty line as wrapper
            console.log(" ")
            console.log("Unzipping prerequisites...")
            let zips = [/*handler.unzip(stepComplete[0].v), handler.unzip(stepComplete[1].v), handler.unzip(stepComplete[2].v)*/]
            // forEach completed download, start the unzipper
            stepComplete.forEach(item => {
                zips.push(handler.unzip(item.v))
            })
            // Wait, until all unzip jobs are done!
            Promise.all(zips.map(reflect)).then((res) => {
                let stepComplete = res.filter(x => x.status === 'completed')
                if (!Array.isArray(stepComplete))
                    return callback("Abort, recieved invalid objects!")
                if (stepComplete.length <= 0)
                    return callback("Abort, none of the required files were downloaded!")
                if (stepComplete.length < dwlds.length)
                    return callback("Some prerequisites could not be unzipped! Aborting...")
                // Create an empty line as wrapper
                console.log(" ")
                console.log("Building projects...")
                const jdk = path.join(__dirname, `/.temp/jdk-${version}`) // Keep in mind, we're setting JAVA_HOME
                const mvn = path.join(__dirname, `/.temp/apache-maven-${mvn_version}/bin/mvn`) // Keep in mind, we're wanna execute the maven script
                const project = process.argv.slice(2)[0] // Keep in mind, this is the path to the maven project which needs to be builded
                handler.install(jdk, mvn, project, platform(), (res) => {
                    console.log(res)
                })
            })
        })
    }

})()