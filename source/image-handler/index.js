/*********************************************************************************************************************
 *  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance        *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://aws.amazon.com/asl/                                                                                    *
 *                                                                                                                    *
 *  or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const ImageRequest = require('./image-request.js');
const ImageHandler = require('./image-handler.js');
const etag = require('etag');

exports.handler = async (event) => {
    console.log(event);
    const imageRequest = new ImageRequest();
    const imageHandler = new ImageHandler();
    try {
        const request = await imageRequest.setup(event);

        console.log(request); // The updated extension should be available here...

        const processedRequest = await imageHandler.process(request);

        const mimeType = getMimeType(request.fileExtension);

        const etagHeader = etag(processedRequest);

        const response = {
            "statusCode": 200,
            "headers" : getResponseHeaders(false, mimeType, etagHeader),
            "body": processedRequest,
            "isBase64Encoded": true
        };

        return response;

    } catch (err) {
        console.log(err);
        const response = {
            "statusCode": err.status,
            "headers" : getResponseHeaders(true),
            "body": JSON.stringify(err),
            "isBase64Encoded": false
        };
        return response;
    }
};

/**
 * Generates a simple mimetype based upon the file extension of the source.
 * If no file extension is found or provided (ie. 'undefined') then a
 * simple 'image' will be returned
 *
 * Author: M.Merryfull
 *
 * 16 Oct 2019 - Created
 * */
const getMimeType = (extension) => {

    if(typeof extension === 'undefined') return "image";

    switch(extension){
        case "jpeg":
        case "jpg":
            return "image/jpeg";

        case "bmp":
            return "image/bmp";

        case "gif":
            return "image/gif";

        case "svg":
            return "image/svg+xml";

        case "tif":
        case "tiff":
            return "image/tiff";

        case "ico":
            return "image/x-icon";

        // Not Mapped..
        default:
            return "image";
    }
};

/**
 * Generates the appropriate set of response headers based on a success 
 * or error condition.
 * @param {boolean} isErr - has an error been thrown? 
 */
const getResponseHeaders = (isErr, mime, etag) => {

    const corsEnabled = (process.env.CORS_ENABLED === "Yes");

    const headers = {
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": mime,
    };

    if(typeof etag !== 'undefined'){
        headers['ETag'] = etag;

        //
        // If we have an etag, apply a cache control header..
        headers['Cache-Control'] = `public, max-age=${typeof process.env.MAX_AGE === 'undefined' ? 300 : process.env.MAX_AGE}`;
    }

    if (corsEnabled) {
        headers["Access-Control-Allow-Origin"] = process.env.CORS_ORIGIN;
    }

    if (isErr) {
        headers["Content-Type"] = "application/json"
    }

    return headers;
};
