var ObjectID = require('mongodb').ObjectID;
const _ = require('lodash');
module.exports = function (app, db) {

  app.get('/notes/:id', (req, res) => {
    const id = req.params.id;
    db.collection('notes').find({ "user_id": id }).toArray(function (err, result) {
      if (err) throw err;
      res.send(result);
    });
  });

  app.post('/pharmacy/notes', (req, res) => {
    let multi = req.body.multi;
    if (multi) {
      let results = req.body.coordinates.map((pharmacy, index) => {
        return new Promise((resolve, reject) => {
          const latPh = pharmacy.lat;
          const lonPh = pharmacy.lon;
          const phId = pharmacy.id
          filterCalls(latPh, lonPh, phId).then((results) => {
            return resolve({ phId, results });
          });
        });
      });
      Promise.all(results).then((results) => {
        res.status(200).send(results)
      });
    } else {
      const latPh = req.body.lat;
      const lonPh = req.body.lon;
      const phId = req.body.id;
      filterCalls(latPh, lonPh, phId).then((results) => {
        res.send(results);
      });
    }
  });

  function filterCalls(latPh, lonPh, phId) {
    return new Promise((resolve, reject) => {
      const half_hour_ago = Date.now() - 30 * 60 * 1000;
      db.collection('notes').find({ "time": { $gte: half_hour_ago }, "answer.phId": { $nin: [phId] }, "rejected": { $nin: [phId] } }).toArray(function (err, result) {
        if (err) throw err;

        result = result.map(function (call, index) {
          const R = 6371;
          const dLat = deg2rad(call.lat - latPh);
          const dLon = deg2rad(call.lng - lonPh);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(latPh)) * Math.cos(deg2rad(call.lat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const d = R * c;
          if (d <= call.radius) {
            return call;
          }
        });
        return resolve(_.compact(result));
      });
    });
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180)
  }

  // app.post('/user/auth', (req, res) => {
  //   const login = req.body.login;
  //   const password = req.body.password;
  //   const manager = req.body.manager;
  //   if (manager) {
  //     db.collection('pharmacy_manager').find({ "login": login, "password": password }).toArray((err, manager) => {
  //       if (err) throw err;
  //       else if (!_.isEmpty(manager)) {
  //         db.collection('users').find({ "net": manager[0].net }).toArray((err, documents) => {
  //           if (err) throw err;
  //           else {
  //             res.status(200).send({ success: true, manager: manager[0], documents });
  //           }
  //         });
  //       } else {
  //         res.status(200).send({ success: false });
  //       }
  //     });
  //   } else {
  //     db.collection('users').find({ "login": login, "password": password }).toArray(function (err, result) {
  //       if (err) throw err;
  //       if (!_.isEmpty(result)) {
  //         db.collection('history').insert({ "phId": result[0]._id, "time": Date.now() }, (err, success) => {
  //           if (err) throw err;
  //           res.status(200).send({ document: result, success: true });
  //         });
  //       } else {
  //         res.status(200).send({ success: false, document: {} })
  //       }
  //     });
  //   }
  // });

  app.get('/drugs', (req, res) => {
    db.collection('drugs').find({}).toArray(function (err, result) {
      if (err) throw err;
      res.send(result);
    });
  });

  app.post('/drugs', (req, res) => {
    const filter = req.body.label;
    db.collection('drugs').find({ 'A': filter }).toArray(function (err, result) {
      if (err) throw err;
      res.send(result);
    });
  });

  app.get('/suggestions/:label', (req, res) => {
    const label = req.params.label;
    db.collection('drugs').find({ 'A': { $regex: "^" + label + ".*" } }, { 'A': 1 }).limit(50).toArray(function (err, result) {
      if (err) throw err;
      res.send(result);
    });
  });

  app.post('/notes', (req, res) => {
    const note = { drugs: req.body.drugs, time: Date.now(), lat: req.body.lat, lng: req.body.lng, pending: req.body.pending, user_id: req.body.user_id, answer: req.body.answer, radius: req.body.radius, rejected: req.body.rejected };

    db.collection('notes').insert(note, (err, result) => {
      if (err) {
        res.send({ 'error': 'An error has occurred' });
      } else {
        res.send(result.ops[0]);
      }
    });
  });

  app.get('/limits/:id', (req, res) => {
    const id = req.params.id;
    const half_hour_ago = Date.now() - 30 * 60 * 1000;
    db.collection('notes').find({ "user_id": id, "time": { $gte: half_hour_ago } }).toArray(function (err, result) {
      if (err) throw err;
      else {
        if (result.length >= 3) {
          res.status(403);
          res.send({ allowed: false, req_left: 0 });
        }
        else {
          const left = 3 - result.lenght;
          res.send({ allowed: true, req_left: left });
        }
      }
    });
  });

  app.post('/register', (req, res) => {

    const customer = req.body;

    db.collection('customers').find({ "login": customer.login }).toArray(function (err, result) {
      if (err) throw err;
      if (result.length < 1) {

        db.collection('customers').insert(customer, (err, result) => {
          if (err) {
            res.send({ 'error': 'An error has occurred' });
          } else {
            res.send(customer)
          }
        });

      } else {
        res.send({ success: false })
      }
    });

  });

  app.post('/auth', (req, res) => {
    const login = req.body.login;
    const password = req.body.password;

    db.collection('customers').find({ "login": login, "password": password }).toArray(function (err, result) {
      if (err) throw err;
      if (result.length < 1) {
        res.send({ success: false });
      } else {
        res.send({ success: true });
      }
    });
  });

  app.delete('/notes/:id', (req, res) => {
    const id = req.params.id;
    const details = { '_id': new ObjectID(id) };
    db.collection('notes').remove(details, (err, item) => {
      if (err) {
        res.send({ 'error': 'An error has occurred' });
      } else {
        res.send('Note ' + id + ' deleted!');
      }
    });
  });

  app.put('/notes/:id', (req, res) => {
    const id = req.params.id;
    const details = { '_id': new ObjectID(id) };
    const note = { drugs: req.body.drugs, time: Date.now(), lat: req.body.lat, lng: req.body.lng, pending: req.body.pending, user_id: req.body.user_id, answer: req.body.answer, rejected: req.body.rejected, radius: req.body.radius };

    db.collection('notes').update(details, note, (err, result) => {
      if (err) {
        res.send({ 'error': 'An error has occurred' });
      } else {
        res.send(note);
      }
    });
  });

  //test 2.0
  app.post('/user/password', (req, res) => {
    const login = req.body.login;
    const password = req.body.password;
    const newPassword1 = req.body.newPassword1;
    const newPassword2 = req.body.newPassword2;

    db.collection('users').find({ "login": login, "password": password }).toArray(function (err, result) {
      if (err) throw err;

      if (!_.isEmpty(result)) {
        if (newPassword1 === newPassword2) {
          console.log('WESZLEM')
          db.collection('users').update({ "login": login }, { $set: { "password": newPassword1 } }, (err, result) => {
            if (err) {
              res.send({ 'error': 'An error has occurred' });
            } else {
              // ???
              if (err) throw err;
              res.status(200).send({ document: result, success: true })
            }
          })
        } else {
          res.send({ 'error': 'Passwords are not identical' });
        }

      } else {
        res.status(200).send({ success: false, document: {} })
      }
    });
  })

  //rejestracja
  app.post('/register/ph', (req, res) => {
    const login = req.body.login;
    const ph = { "name": req.body.name, "street": req.body.street, "city": req.body.city, "post-code": req.body.postCode, "voivodeship": req.body.voivodeship, "phone": req.body.phone, "login": req.body.login, "password": req.body.password };

    //sprawdz czy user istnieje
    db.collection('users').find({ "login": login }).toArray(function (err, result) {
      if (err) throw err;
      //nie istnieje
      if (_.isEmpty(result)) {
        db.collection('users').insert(ph, (err, result) => {
          if (err) {
            res.send({ 'error': 'An error has occurred' });
          } else {
            res.send(result);
          }
        });
      //istnieje error
      } else {
        res.send({'error': 'User istnieje'})
      }
    });

  });


};
