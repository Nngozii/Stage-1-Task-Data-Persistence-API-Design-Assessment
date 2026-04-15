const express = require("express");
var cors = require('cors')

const port = 9100;

const app = express();

app.use(cors())



app.listen(port, () => {
  console.log("Server listen on port", port);
});