/*
    AUTHOR: sajon oso
    https://github.com/sajonoso

    Requires NodeJS >= v4.5.0
    No other 3rd party dependencies needed
  
    This script generates a list of suburb name and post codes from the Australian Bureau of Statistics data

    The data files were downloaded from this link:
    http://www.abs.gov.au/AUSSTATS/abs@.nsf/DetailsPage/1270.0.55.003July%202016?OpenDocument
    
    The two required documents were obtained from the following 2 downloads:
    
    NAME: Postal Areas ASGS Edition 2016 in .csv Format 
    DOWNLOAD: http://www.abs.gov.au/ausstats/subscriber.nsf/log?openagent&1270055003_poa_2016_aust_csv.zip&1270.0.55.003&Data%20Cubes&BCC18002983CD965CA25802C00142BA4&0&July%202016&13.09.2016&Previous
    DOCUMENT: POA_2016_AUST.csv
    
    NAME: State Suburbs ASGS Edition 2016 in .csv Format 
    DOWNLOAD: http://www.abs.gov.au/ausstats/subscriber.nsf/log?openagent&1270055003_ssc_2016_aust_csv.zip&1270.0.55.003&Data%20Cubes&42CEBC5514202AFDCA25802C00142C05&0&July%202016&13.09.2016&Previous
    DOCUMENT: SSC_2016_AUST.csv
*/

const fs = require('fs')

const POA_DATA_FILE = 'POA_2016_AUST.csv'
const SSC_DATA_FILE = 'SSC_2016_AUST.csv'
const STATE_CODES = {
  1: 'NSW',
  2: 'VIC',
  3: 'QLD',
  4: 'SA',
  5: 'WA',
  6: 'TAS',
  7: 'NT',
  8: 'ACT',
  9: 'OTHER',
}

// SOURCE: https://stackoverflow.com/questions/7545147/nodejs-synchronization-read-large-file-line-by-line
function forEachLine(filename, fn) {
  const bufSize = 64 * 1024
  const buf = Buffer.alloc(bufSize)
  var leftOver = ''
  var lineNum = 0
  var lines, n

  const fd = fs.openSync(filename, 'r')
  while ((n = fs.readSync(fd, buf, 0, bufSize, null)) !== 0) {
    lines = buf.toString('utf8', 0, n).split('\n')
    lines[0] = leftOver + lines[0] // add leftover string from previous read
    while (lines.length > 1) { // process all but the last line
      fn(lines.shift(), lineNum)
      lineNum++
    }
    leftOver = lines.shift() // save last line fragment (may be '')
  }
  fs.closeSync(fd)
  if (leftOver) fn(leftOver, lineNum) // process any remaining line
}


// console.log('## Reading post code table');
const postcode_table = {}

function addLineToPostcodeTable(line) {
  const fields = line.split(',')
  const mb_code = fields[0]
  const post_code = fields[1]
  postcode_table[`${mb_code}`] = `${post_code}`
}

forEachLine(POA_DATA_FILE, function (line, index) {
  if (index > 0) addLineToPostcodeTable(line)
})


// console.log('## linking with names');
const postcode_list = {}

function fixSuburbName(rawSuburbName) {
  var fixedSuburbName = rawSuburbName

  // strip round bracket comments  
  if (fixedSuburbName.indexOf('(') > 0) fixedSuburbName = fixedSuburbName.slice(0, fixedSuburbName.indexOf('('))

  // remove ACT remainder prefix
  fixedSuburbName = fixedSuburbName.replace('ACT Remainder -', '')

  return fixedSuburbName.trim();
}

function addLineToPostcodeList(line) {
  const fields = line.split(',')
  const mb_code = fields[0]
  var ssc_name = fields[2]
  var state_code = STATE_CODES[fields[3]]
  if (!state_code) state_code = ''

  ssc_name = fixSuburbName(ssc_name)

  var post_code = postcode_table[`${mb_code}`]
  if (!post_code) post_code = ''

  const list_key = `${ssc_name}${post_code}`
  postcode_list[list_key] = `${mb_code}\t"${post_code}"\t"${ssc_name}"\t${state_code}`
}

forEachLine(SSC_DATA_FILE, function (line, index) {
  if (index > 0) addLineToPostcodeList(line)
});


console.log(`mb_code\tpost_code\tssc_name\tstate_code`)
for (var key in postcode_list) {
  console.log(postcode_list[key])
}