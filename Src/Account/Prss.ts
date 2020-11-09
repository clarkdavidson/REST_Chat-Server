var Express = require('express');
import { Router, Request, Response } from 'express'
import { queryCallback } from 'mysql';
var Tags = require('../Validator.js').Tags;
var async = require('async');
var mysql = require('mysql');
const { Session } = require('../Session.js');

var router = Express.Router({ caseSensitive: true });

router.baseURL = '/Prss';
/*
//.../Prss?email=cstaley
router.get('/', function(req, res) {
   var email = req.session.isAdmin() && req.query.email ||
    !req.session.isAdmin() && req.session.email;
   var cnnConfig = {
      host     : 'localhost',
      user     : 'cstaley',
      password : 'CHSpw',
      database : 'cstaley'
   };

   var cnn = mysql.createConnection(cnnConfig);

   if (email)
      cnn.query('select id, email from Person where email = ?', [email],
      function(err, result) {
         if (err) {
            res.status(500).json("Failed query");
         }
         else {
            res.status(200).json(result);
         }
         cnn.destroy();
      });
   else
      cnn.query('select id, email from Person',
      function(err, result) {
         if (err) {
            res.status(500).json("Failed query");
         }
         else {
            res.status(200).json(result);
         }
         cnn.destroy();
      });
});

// Non-waterfall, non-validator, non-db automation version
router.post('/', function(req, res) {
   var body = req.body;
   var admin = req.session && req.session.isAdmin();
   var errorList = [];
   var qry;
   var noPerm;
   var cnnConfig = {
      host     : 'localhost',
      user     : 'clarkdavidson',
      password : 'asLebcz3!',
      database : 'cdavidson'
   };

   if (admin && !body.password)
      body.password = "*";                       // Blocking password
   body.whenRegistered = new Date();

   // Check for fields
   if (!body.hasOwnProperty('email'))
      errorList.push({tag: "missingField", params: "email"});
   if (!body.hasOwnProperty('password'))
      errorList.push({tag: "missingField", params: "password"});
   if (!body.hasOwnProperty('role'))
      errorList.push({tag: "missingField", params: "role"});

   // Do these checks only if all fields are there
   if (!errorList.length) {
      noPerm = body.role === 1 && !admin;
      if (!body.termsAccepted)
         errorList.push({tag: "noTerms"});
      if (body.role < 0 || body.role > 1)
         errorList.push({tag: "badVal", param: "role"});
   }

   // Post errors, or proceed with data fetches
   if (noPerm)
      res.status(403).end();
   else if (errorList.length)
      res.status(400).json(errorList);
   else {
      var cnn = mysql.createConnection(cnnConfig);

      // Find duplicate Email if any.
      cnn.query(qry = 'select * from Person where email = ?', body.email,
      function(err, dupEmail) {
         if (err) {
            cnn.destroy();
            res.status(500).json("Failed query " + qry);
         }
         else if (dupEmail.length) {
            cnn.destroy();
            res.status(400).json({tag: "dupEmail"});
         }
         else { // No duplicate, so make a new Person
            body.termsAccepted = body.termsAccepted && new Date();
            cnn.query(qry = 'insert into Person set ?', body,
            function(err, insRes) {
               cnn.destroy();
               if (err)
                  res.status(500).json("Failed query " + qry);
               else
                  res.location(router.baseURL + '/' + insRes.insertId).end();
            });
          }
      });
   }
});
*/
// Much nicer versions

interface Person {
   id: number;
   firstName: String;
   lastName: String;
   password: String;
   role: number;
   termsAccepted: boolean;
}

interface Result {
   insertId: Number
   affectedRows: Number
}


//Remove Password from this return value!
router.get('/', function (req: Request, res: Response) {
   console.log("Query Email = " + req.query.email);
   console.log("Session Email = " + req.session.email);
   console.log("Is Person A Admin " + req.session.isAdmin());
   let email = req.query.email;

   console.log(req.query.email);
   console.log("First Test = " + req.session.isAdmin() && req.query.email);
   console.log("Second Test = " + !req.session.isAdmin() && req.query.email);


   var handler = function (err: Error, prsArr: Person[], fields: any) {
      for (let i = 0; i < prsArr.length; i++) {
         delete prsArr[i].password;
      }
      res.json(prsArr);
      //Assuming a connection is already there
      req.cnn.release();
   };

   console.log("Value of Email : " + email)

   if (email && req.session.isAdmin()) {
      console.log('1');
      //Using Handler as a Callback
      email += "%";
      req.cnn.chkQry("select id, email from Person where email LIKE ? ", [email],
         handler);
   }
   else if (req.session.isAdmin() && !email) {
      console.log('2');
      req.cnn.chkQry('select id, email from Person', null, handler);
   }
   else if (!req.session.isAdmin() && (req.session.email.includes(email as string) || !email)) {
      console.log('3');
      req.cnn.chkQry('select id,email from person where email = ?', [req.session.email], handler);
   } else if (!req.session.isAdmin() && !req.session.email.includes(email as string)) {
      req.cnn.chkQry('select id, email from person where email = null', null, handler);
   }

});

router.post('/', function (req: Request, res: Response) {
   var vld = req.validator;  // Shorthands
   var body = req.body; // Request Body
   var admin = req.session && req.session.isAdmin(); //Check for Admin
   var cnn = req.cnn; // Connection From Connection Pool

   if (admin && !body.password)
      body.password = "*";                       // Blocking password
   body.whenRegistered = new Date();

   async.waterfall([
      function (cb: queryCallback) { // Check properties and search for Email duplicates
         if (vld.hasFields(body, ["email", "password", "role"], cb) &&
            vld.chain(body.role === 0 || admin, Tags.forbiddenRole, null)
               //.chain(body.roll !== null || body.roll !== "", Tags.missingField, ['role'])
               .chain(body.termsAccepted || admin, Tags.noTerms, null)
               .chain(body.password || admin, Tags.missingField, 'password')
               .chain(body.email, Tags.missingField, ['email'])
               .chain(body.lastName, Tags.missingField, 'lastName')
               .chain(body.firstName.length <= 30, Tags.badValue, ['firstName'])
               .chain(body.email.length <= 150, Tags.badValue, ['email'])
               .chain(body.lastName.length <= 50, Tags.badValue, ['lastName'])
               .chain(body.password.length <= 50, Tags.badValue, ['password'])
               .check(body.role >= 0, Tags.badValue, ["role"], cb)) {
            cnn.chkQry('select * from Person where email = ?', body.email, cb)
         }
      },
      function (existingPrss: Person[], fields: any, cb: queryCallback) {  // If no duplicates, insert new Person
         if (vld.check(!existingPrss.length, Tags.dupEmail, null, cb) &&
            vld.check(body.role !== null || body.role !== "", Tags.missingField, ["role"], cb)) {
            body.termsAccepted = body.termsAccepted && new Date();
            cnn.chkQry('insert into Person set ?', body, cb);
         }
      },
      function (result: Result, fields: any, cb: queryCallback) { // Return location of inserted Person
         res.location(router.baseURL + '/' + result.insertId).end();
         cb(null, null, null);
      }],
      function (err: Error) {
         cnn.release();
      });
});


/* Fill in this version */
router.put('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var body = req.body;
   var admin = req.session.isAdmin();
   var cnn = req.cnn;


   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkPrsOK(req.params.id, cb) &&
            vld.chain(!("whenRegistered" in body), Tags.forbiddenField, ["whenRegistered"])
               .chain(!("termsAccepted" in body), Tags.forbiddenField, ["termsAccepted"])
               .chain(!("role" in body) || body.role === 0 || admin, Tags.badValue, ["role"])
               .chain(!("password" in body) || (body.password !== null && body.password !== "") && body.password.length <= 50, Tags.badValue, ["password"])
               .chain(admin || !body.password || body.oldPassword)
               .chain(!("lastName" in body) || body.lastName.length <= 50, Tags.badValue, ["lastName"])
               .chain(!("email" in body), Tags.badValue, ["email"])
               .check(!("firstName" in body) || body.firstName.length <= 30,
                  Tags.badValue, ["firstName"]), cb)
            cnn.chkQry('select * from Person where id = ?', [req.params.id], cb);
      },
      (prss: Person[], fields: any, cb: queryCallback) => {
         if (vld.check(prss.length, Tags.notFound, null, cb) &&
            vld.check(admin || body.oldPassword === prss[0].password, Tags.oldPwdMismatch, ["Password Does not Match Old Password"], cb)) {
            delete body.id;
            delete body.oldPassword;
            if (Object.keys(body).length) {
               cnn.chkQry('update Person set ? where id = ?', [req.body, req.params.id], cb);
            }
            else {
               console.log('try again');
               cb(null, null, null);
            }
         }

      },
      (updateResult: any, fields: any, cb: any) => {
         res.status(200).end();
         cb();
      }],
      function (err: Error) {
         console.log('You Ended up here');
         cnn.release();
      });

});

//Remove Password from PrsArr

router.get('/:id', function (req: Request, res: Response) {
   var vld = req.validator;

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkPrsOK(req.params.id, cb) || vld.checkAdmin())
            req.cnn.chkQry('select * from Person where id = ?', [req.params.id],
               cb);
      },
      function (prsArr: Person[], fields: any, cb: Function) {
         if (vld.check(prsArr.length, Tags.notFound, null, cb)) {
            console.log(prsArr[0].password);
            delete prsArr[0].password;
            console.log(prsArr[0].password);
            res.json(prsArr);
            cb();
         }
      }],
      (err: Error) => {
         req.cnn.release();
      });
});

/*
router.get('/:id', function(req, res) {
   var vld = req.validator;

   if (vld.checkPrsOK(req.params.id)) {
      req.cnn.query('select * from Person where id = ?', [req.params.id],
      function(err, prsArr) {
         if (vld.check(prsArr.length, Tags.notFound))
            res.json(prsArr);
         req.cnn.release();
      });
   }
   else {
      req.cnn.release();
   }
});
*/


//________________________________//
//  Connection Not being Released \\
router.delete('/:id', function (req: Request, res: Response) {
   var vld = req.validator;
   var userId = req.params.id;
   console.log(userId);

   Session.deletedUser(userId);

   async.waterfall([
      function (cb: queryCallback) {
         if (vld.checkAdmin(cb)) {
            //console.log("Admin Check Cleared");
            //console.log(vld.checkAdmin());
            req.cnn.chkQry('DELETE from Person where id = ?', [req.params.id], cb);
         }
      },
      function (result: Result, fields: any, cb: Function) {
         if (vld.check(result.affectedRows, Tags.notFound, null, cb)) {
            //console.log("Person Deleted");
            res.end();
            cb();
         }
      }],
      function (err: Error) {
         console.log('Connection Releaserd');
         req.cnn.release();
      });
});

module.exports = router;
