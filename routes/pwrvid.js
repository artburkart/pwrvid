var express = require('express');
var router = express.Router();

/* GET pwrvid page. */
router.get('/', function (req, res) {
  res.render('pwrvid', { title: 'PWRVID' });
});

module.exports = router;
