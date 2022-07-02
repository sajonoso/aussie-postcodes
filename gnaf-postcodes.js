/*
    AUTHOR: sajon oso
    https://github.com/sajonoso

    Requires NodeJS >= v4.5.0
    No other 3rd party dependencies needed
  
    This script generates a list of suburb name and post codes from Geoscape G-NAF data

    The data file downloaded from this link: (about 1.5Gb in size)
    https://data.gov.au/dataset/ds-dga-19432f89-dc3a-4ef3-b943-5326ef1dbecc/details?q=g%20naf
    
    Extract the required documents with 7zip as follows:
    
7z e /g-naf_may22_allstates_gda2020_psv_106.zip -o./gnaf/ -r \
???_LOCALITY_psv.psv ???_LOCALITY_POINT_psv.psv ??_LOCALITY_psv.psv ??_LOCALITY_POINT_psv.psv *_ADDRESS_DETAIL_psv.psv

*/

const print = console.log
const fs = require('fs')

const DATA_DIR = './gnaf'


// Reads a file line by line and executes a function on each line
// SOURCE: https://stackoverflow.com/questions/7545147/nodejs-synchronization-read-large-file-line-by-line
function forEachLine(filename, fn) {
  const bufSize = 64 * 1024
  const buf = Buffer.alloc(bufSize)
  var leftOver = ''
  var lineNum = 0
  var lines, n

  const fd = fs.openSync(filename, 'r')
  while ((n = fs.readSync(fd, buf, 0, bufSize, null)) !== 0) {
    lines = buf.toString('utf8', 0, n).split('\r\n')
    lines[0] = leftOver + lines[0] // add leftover string from previous read
    while (lines.length > 1) { // process all but the last line
      if (fn(lines.shift(), lineNum)) return; // stop processing lines if function returns true
      lineNum++
    }
    leftOver = lines.shift() // save last line fragment (may be '')
  }
  fs.closeSync(fd)
  if (leftOver) fn(leftOver, lineNum) // process any remaining line
}

// executes a function for each file in folder
function forEachfile(path, pattern, fn) {
  fs.readdir(path, function (err, files) {
    if (!err) {
      const regex = new RegExp(pattern)
      files.forEach(function (file) {
        if (regex.test(file)) {
          const result = fn(file)
          if (result) return // stop processing files if function returns true
        }
      });
    }
  });
}

var stateCache = {}

// fills the state cache with the geolocation of all localities
function fillGeolocationCache(state) {
  const columns = { LOCALITY_PID: -1, LONGITUDE: -1, LATITUDE: -1 }

  forEachLine(`${DATA_DIR}/${state}_LOCALITY_POINT_psv.psv`, function (line, index) {
    if (index === 0) {
      const fieldNames = line.split('|')
      columns.LOCALITY_PID = fieldNames.indexOf('LOCALITY_PID')
      columns.LONGITUDE = fieldNames.indexOf('LONGITUDE')
      columns.LATITUDE = fieldNames.indexOf('LATITUDE')
    } else {
      fields = line.split('|')
      localityPid = fields[columns.LOCALITY_PID]
      if (!stateCache[localityPid]) stateCache[localityPid] = {
        lon: fields[columns.LONGITUDE],
        lat: fields[columns.LATITUDE],
        postcode: ''
      }
    }
  })
}

// fills the state cache with the postcode of all localities
function fillPostcodeCache(state) {
  const columns = { LOCALITY_PID: -1, POSTCODE: -1 }

  forEachLine(`${DATA_DIR}/${state}_ADDRESS_DETAIL_psv.psv`, function (line, index) {
    if (index === 0) {
      const fieldNames = line.split('|')
      columns.LOCALITY_PID = fieldNames.indexOf('LOCALITY_PID')
      columns.POSTCODE = fieldNames.indexOf('POSTCODE')
    } else {
      fields = line.split('|')
      localityPid = fields[columns.LOCALITY_PID]
      if (!stateCache[localityPid]) {
        stateCache[localityPid] = { lon: 0, lat: 0, postcode: fields[columns.POSTCODE] }
      } else {
        stateCache[localityPid].postcode = fields[columns.POSTCODE]
      }
    }
  })

}

function fillStateLocalityCache(state) {
  stateCache = {}
  fillGeolocationCache(state)
  fillPostcodeCache(state)
  // print(`${state} Cache size: ${JSON.stringify(stateCache).length}`)
}


function getLocalityData(state, columns, fields) {
  const localityPid = fields[columns.LOCALITY_PID]
  const localityName = fields[columns.LOCALITY_NAME]
  const geolocation = { lon: stateCache[localityPid].lon, lat: stateCache[localityPid].lat }
  const postcode = stateCache[localityPid].postcode
  // only print entries with post code
  if (postcode) print(`${state}\t${localityPid}\t${postcode}\t${localityName}\t${geolocation.lon}\t${geolocation.lat}`)
}



print(`STATE\tLOCALITY_PID\tPOSTCODE\tLOCALITY_NAME\tLONGITUDE\tLATITUDE`)

forEachfile(DATA_DIR, ".*_LOCALITY_psv.psv$", function (localityFile) {
  const state = localityFile.split('_')[0]
  const columns = { LOCALITY_PID: -1, LOCALITY_NAME: -1, STATE_PID: -1 }
  let fields
  forEachLine(`${DATA_DIR}/${localityFile}`, function (line, index) {
    if (index === 0) {
      const fieldNames = line.split('|')
      columns.LOCALITY_PID = fieldNames.indexOf('LOCALITY_PID')
      columns.LOCALITY_NAME = fieldNames.indexOf('LOCALITY_NAME')
      columns.STATE_PID = fieldNames.indexOf('STATE_PID')
      fillStateLocalityCache(state)
    } else {
      fields = line.split('|')
      getLocalityData(state, columns, fields)
    }
  })
})