const express = require("express");
const router = express.Router();
const ZipModel = require("./MongoDB/certy_zips");
const createError = require("http-errors");
const { default: mongoose } = require("mongoose");

router.get("/", async (req, res, next) => {
    const id = req.query.id;
    try {
        const file = await ZipModel.findById(id);
        if (!file) {
            throw createError(404, "File does not Exists");
        }
        res.download(file.path);
    } catch (error) {
        if (error instanceof mongoose.CastError) {
            next(createError(400, "Invalid File ID"));
            return;
        }
        next(error);
    }
});

module.exports = router;
