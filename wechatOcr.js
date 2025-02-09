const ffi = require('ffi-napi');
const ref = require('ref-napi');
const wchar = require('ref-wchar-napi'); 
const { promisify } = require('util');
const path = require('path');

// Define the DLL interface with absolute path
const WechatOCR = ffi.Library(path.join(__dirname, 'wcocr.dll'), {
    'wechat_ocr': ['bool', [
        wchar.string,  // ocrExeWStr
        wchar.string,  // wechatDirWStr
        'string',      // imgFn
        'pointer'      // callback
    ]],
});
async function performOCR(ocrExePath, wechatDirPath, imagePath) {
    console.log("Starting OCR process...");
    return new Promise((resolve, reject) => {
        try {
            // 验证DLL是否正确加载
            if (!WechatOCR || !WechatOCR.wechat_ocr) {
                throw new Error("DLL not properly loaded");
            }

            // 检查文件路径是否都是字符串类型
            console.log("Checking parameters types:", {
                ocrExePath: typeof ocrExePath,
                wechatDirPath: typeof wechatDirPath,
                imagePath: typeof imagePath
            });

            const callback = ffi.Callback('void', ['string'], (result) => {
                if (!result) {
                    reject(new Error("OCR result is empty"));
                    return;
                }
                resolve(result);
            });

            try {
                console.log("Attempting to call DLL function...");
                const success = WechatOCR.wechat_ocr(
                    ocrExePath,
                    wechatDirPath,
                    imagePath,
                    callback
                );
                console.log("OCR function call returned:", success);
                
                if (!success) {
                    // 更详细的错误信息
                    const error = new Error("OCR initialization failed");
                    error.details = {
                        ocrExePath,
                        wechatDirPath,
                        imagePath
                    };
                    reject(error);
                }
            } catch (dllError) {
                console.error("DLL call failed with error:", {
                    message: dllError.message,
                    code: dllError.code,
                    stack: dllError.stack
                });
                reject(dllError);
            }
        } catch (error) {
            console.error("Error in performOCR:", error);
            reject(error);
        }
    });
}

async function main() {
    try {
        console.log("OCR begin...");
        
        // 替换成你自己本地的
        const ocrExe = "C:\\Users\\98178\\AppData\\Roaming\\Tencent\\WeChat\\XPlugin\\Plugins\\WeChatOCR\\7079\\extracted\\WeChatOCR.exe";
        const wechatDir = "D:\\normalLife\\WeChat\\[3.9.12.29]";
        // 替换成你自己的图片路径或者直接用我的demo图片
        const testImage = "D:\\selfProject\\wechat-ocr-js\\test_img\\3.png";

        // Verify if files exist
        const fs = require('fs');
        [ocrExe, wechatDir, testImage].forEach(path => {
            if (!fs.existsSync(path)) {
                throw new Error(`Path does not exist: ${path}`);
            }
        });

        const result = await performOCR(ocrExe, wechatDir, testImage);
        // console.log("OCR result:", result);
        const {ocr_response} = JSON.parse(result);
        const combinedText = ocr_response
            .sort((a, b) => a.top - b.top)  // 按照 top 坐标排序，确保文本顺序从上到下
            .map(item => item.text)          // 提取所有的 text 字段
            .join('\n');                     // 用换行符连接所有文本
        
        console.log("Combined text:");
        console.log(combinedText);
        console.log("OCR end...");
    } catch (error) {
        console.error("Error in main:", error);
    }
}

// Run the main function
main().catch(console.error);
exports.performOCR = performOCR;