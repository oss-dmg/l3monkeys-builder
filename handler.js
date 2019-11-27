/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Benny Nystroem. All rights reserved.
 *  Licensed under the GNU GENERAL PUBLIC LICENSE v3 License. 
 *  See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Dependencies
const fs = require('fs')
const request = require('request')
const _cliProgress = require('cli-progress')
const StreamZip = require("node-stream-zip")

module.exports.download = (cliProgress, url, dest) => {
    // Promise - pipe handling
    return new Promise((resolve, reject) => {
        // Required variables, constants
        let progressBar = null
        // Streaming helpers
        const file = fs.createWriteStream(dest)
        const sendReq = request.get({
            url: url,
            headers: {
                connection: 'keep-alive',
                'Cookie': 'gpw_e24=http://www.oracle.com/; oraclelicense=accept-securebackup-cookie'
            }
        })
        // Bytes calculation
        let receivedBytes = 0

        // verify response code
        sendReq
            .on('response', (response) => {
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(dest, () => {}); // Delete temp file
                    reject('Response status was ' + response.statusCode)
                } else {
                    // Calculate estimated time
                    const totalBytes = response.headers['content-length']
                    progressBar = cliProgress.create(totalBytes, 0)
                }
            })
            .on('data', (chunk) => {
                receivedBytes += chunk.length;
                progressBar.update(receivedBytes, { filename: dest.replace("./", "") });
            })
            .pipe(file)

        // close() is async, call cb after close completes
        file.on('finish', () => {
            file.close()
            progressBar.stop()
            resolve(dest)
        })

        // check for request errors
        sendReq.on('error', (err) => {
            file.close()
            fs.unlink(dest, () => {}) // Delete temp file
            progressBar.stop()
            reject(err)
        })

        file.on('error', (err) => { // Handle errors
            file.close()
            if (err.code === "EEXIST")
                reject("File already exists")
            else {
                fs.unlink(dest, () => {}) // Delete the file async. (But we don't check the result)
                progressBar.stop()
                reject(err)
            }
        })
    })
}

module.exports.unzip = (dest) => {
    return new Promise((resolve, reject) => {
        // Download complete, unzip archive
        const zip = new StreamZip({
            file: dest,
            storeEntries: true
        })
        // Extract everything
        zip.on('ready', () => {
            if (!fs.existsSync('.temp'))
                fs.mkdirSync('.temp')
            zip.extract(null, './.temp', (err, count) => {
                zip.close()
                if (err)
                    reject(err)
                else
                    resolve(count)
                //console.log(err ? 'Extract error' : `Extracted ${count} entries`);
            })
        })
    })
}

module.exports.install = (jdk, mvn, project, platform, callback) => {
    const { spawn } = require('child_process')
    let child = null

    switch (platform) {
        case 'macosx':
            child = spawn(`cd ${project} && touch .mavenrc && echo "JAVA_HOME=${jdk}" > .mavenrc && ${mvn} package`)
            break;
        case 'windows':
            child = spawn(`set JAVA_HOME=${jdk} && cd ${project} && ${mvn}.cmd package`)
            break;
        case 'linux':
            child = spawn(`cd ${project} && JAVA_HOME=${jdk} ${mvn} package`)
            break;
        default:
            return callback("Platform undefined, aborting installer...")
    }
    child.stderr.on('data', (data) => {
        return callback(`Subprocess throws an error: ${data}`)
    })
    child.stdout.on('data', (data) => {
        console.log(data)
    })
    child.on('exit', (code, signal) => {
        return callback(`Subprocess exited with ${code} and ${signal}`)
    })
}