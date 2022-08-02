const express = require("express");
const router = express.Router();
const multer = require("multer");
const { spawnSync } = require("child_process");
const zipLocal = require("zip-local");
const fs = require("fs");
const upload = multer();
const createError = require("http-errors");
const google = require("./GoogleSheetsAPI/sheets");
const ZipModel = require("./MongoDB/certy_zips");

router.post("/", upload.none(), async (req, res, next) => {
    const url = req.body.link;
    const template_id = req.body.templateID;
    const creds = "./Routes/GoogleSheetsAPI/creds.json";

    try {
        //get spreadsheet data and convert to json
        const data = await google.googleSheet(url, creds);
        fs.writeFileSync(
            "Temp/" + data.sheetTitle + ".json",
            JSON.stringify(data.sheetData),
            "utf-8"
        );

        //Run python script to create certificates
        spawnSync("python", ["main.py", data.sheetTitle, template_id]);

        //delete the json file
        fs.unlinkSync("Temp/" + data.sheetTitle + ".json");

        //crete and add zip file path to database
        const zip = new ZipModel({
            name: data.sheetTitle,
            path: "",
        });

        const uid = await zip.save();

        const savePath = "Temp/" + data.sheetTitle + "_" + uid.id + ".zip";

        zipLocal.sync
            .zip("Output/" + data.sheetTitle)
            .compress()
            .save(savePath);

        await ZipModel.findByIdAndUpdate(uid.id, {
            path: savePath,
        });

        //Remove temporary files
        fs.rmSync("Output/" + data.sheetTitle, { recursive: true }, (err) => {
            if (err) {
                throw err;
            }
        });

        //send zip fileID in response
        const obj = { fileID: uid.id };
        res.json(obj);
    } catch (error) {
        error.status = 404;
        next(error);
    }
});

module.exports = router;
