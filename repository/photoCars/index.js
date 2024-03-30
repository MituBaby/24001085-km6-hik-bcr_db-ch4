const crypto = require("crypto");
const path = require("path");
const { cars, photoCars } = require("../../models");
const { uploader } = require("../../helper/cloudinary");
const { getData, setData, deleteData } = require("../../helper/redis");

exports.getPhotos = async () => {
  const data = await photoCars.findAll({
    include: {
      model: cars,
    },
  });
  return data;
};

exports.getPhoto = async (id) => {
  const key = `photo:${id}`;

  // get from redis
  let data = await getData(key);
  if (data) {
    return data;
  }

  // get from db
  data = await photoCars.findAll({
    where: {
      id,
    },
    include: {
      model: cars,
    },
  });
  if (data.length > 0) {
    // save to redis
    await setData(key, data[0], 300);

    return data[0];
  }

  throw new Error(`Photo is not found!`);
};

exports.createPhoto = async (payload) => {
  if (payload.photo) {
    // upload image to cloudinary
    const { photo } = payload;

    // make unique filename -> 213123128uasod9as8djas
    photo.publicId = crypto.randomBytes(16).toString("hex");

    // rename the file -> 213123128uasod9as8djas.jpg / 213123128uasod9as8djas.png
    photo.name = `${photo.publicId}${path.parse(photo.name).ext}`;

    // Process to upload image
    const imageUpload = await uploader(photo);
    payload.photo = imageUpload.secure_url;
  }

  // save to db
  const data = await photoCars.create(payload);

  // save to redis
  const key = `photo:${data.id}`;
  await setData(key, data, 300);

  return data;
};

exports.updatePhoto = async (id, payload) => {
  const key = `photo:${id}`;

  if (payload.photo) {
    // upload image to cloudinary
    const { photo } = payload;

    // make unique filename -> 213123128uasod9as8djas
    photo.publicId = crypto.randomBytes(16).toString("hex");

    // rename the file -> 213123128uasod9as8djas.jpg / 213123128uasod9as8djas.png
    photo.name = `${photo.publicId}${path.parse(photo.name).ext}`;

    // Process to upload image
    const imageUpload = await uploader(photo);
    payload.photo = imageUpload.secure_url;
  }

  // update to postgres
  await photoCars.update(payload, {
    where: {
      id,
    },
  });

  // get from postgres
  const data = await photoCars.findAll({
    where: {
      id,
    },
    include: {
      model: cars,
    },
  });
  if (data.length > 0) {
    // save to redis
    await setData(key, data[0], 300);

    return data[0];
  }

  return data;
};

exports.deletePhoto = async (id) => {
  const key = `photo:${id}`;

  // delete from postgres
  await photoCars.destroy({ where: { id } });

  // delete from redis
  await deleteData(key);

  return null;
};
