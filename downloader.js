/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Benny Nystroem. All rights reserved.
 *  Licensed under the GNU GENERAL PUBLIC LICENSE v3 License. 
 *  See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// Dependencies
const fs = require('fs')
const request = require('request')
const _cliProgress = require('cli-progress')

module.exports.download = (cliProgress, url, dest, cb) => {
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
                return cb('Response status was ' + response.statusCode)
            }
            // Calculate estimated time
            const totalBytes = response.headers['content-length']
            progressBar = cliProgress.create(totalBytes, 0)
        })
        .on('data', (chunk) => {
            receivedBytes += chunk.length;
            progressBar.update(receivedBytes);
        })
        .pipe(file)

    // close() is async, call cb after close completes
    file.on('finish', () => {
        progressBar.stop()
        file.close(cb)
    })

    // check for request errors
    sendReq.on('error', (err) => {
        fs.unlink(dest)
        progressBar.stop()
        return cb(err.message)
    })

    file.on('error', (err) => { // Handle errors
        fs.unlink(dest) // Delete the file async. (But we don't check the result)
        progressBar.stop()
        return cb(err.message)
    })
}