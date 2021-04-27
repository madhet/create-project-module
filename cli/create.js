const fs = require('fs');
const path = require('path');

/*
TODO:
  [+] check if type value from command line matches the value from template
  [+] throw error if destination folder does not exist
  [+] clear empty strings when splitting path (make function)
  [+] make readme
  [+] console messages about existing destination file
  [-] make functions to get all params when calling - max pure functions
  [-] check error messages
  [-] check function for creating folder
  [-] console messages about progress during runtime and in the end
  [?] create destination folder if it does not exist
  [?] default option to use all files from template folder without manual description, e.g. { "all": pathToFolder }
*/

const TYPE_VALUE_SEPARATOR = '/';
const CONFIG_FILE_NAME = 'cpm.config.json';

const consoleMessage = (message, type = 'log') => {
  const prefixTypes = {
    log: '',
    warn: 'Warning!',
    error: 'ERROR!',
  };

  const prefix = prefixTypes[type] ? `${prefixTypes[type]} ` : '';
    
  const consoleFunc = console[type] || console.log;

  const consoleMessage = `${prefix}${message}\n`;

  consoleFunc(consoleMessage);
};

const printErrorMessage = (message) => {
  consoleMessage(message, 'error');
  process.exit(0);
};

const printWarnMessage = (message) => {
  consoleMessage(message, 'warn');
};

const printMessage = (message) => {
  consoleMessage(message);
};

const printError = (error) => {
  console.error(error);
};

const splitString = (strToSplit, separator) => strToSplit
  .split(separator)
  .filter(part => !!part);

const joinPathes = (...pathes) => path.join(...pathes);

const toPascalCase = (str) => splitString(str, /[-_]/g)
  .map((word) => word 
    ? `${word[0].toUpperCase()}${word.slice(1)}` 
    : '' 
  )
  .join('');

const substituteString = (str, options = {}) => {
  const { pascal } = options;
  return str.replace(/\[\[(\w+)\]\]/g, (_, p1) => {
    const replacement = replaceValues[p1];

    if (!replacement) {
      return '';
    }

    return pascal ? toPascalCase(replacement) : replacement ;
  });
};

const substituteDirPath = (path) => {
  return substituteString(path);
};

const substituteFilePath = (path) => {
  return substituteString(path, { pascal: true });
};

const substituteFileContent = (fileData) => {
  return substituteString(fileData, { pascal: true });
};

// get type name and value from comand line args
const [
  ,               // path to node
  ,               // path to executed js file
  argsType,       // type for config.types
  argsTypeString, // value for config.types[type]
] = process.argv;

// check if type name exists
if (!argsType) {
  printErrorMessage('Required parameter "type-id" is missing!');
}

// check if type value exists
if (!argsTypeString) {
  printErrorMessage('Required parameter "type-value" is missing!');
}

const dirProject = path.resolve('');
const dirCli = __dirname;

const configPath = joinPathes(dirCli, CONFIG_FILE_NAME);

if (!fs.existsSync(configPath)) {
  printErrorMessage(`Can't find "${CONFIG_FILE_NAME}" at ${configPath}!`);
}

let configData = {};

try {
  const configJson = fs.readFileSync(configPath, 'utf-8');
  configData = JSON.parse(configJson);
} catch (error) {
  printError(error);
}

const { types, staticReplacePairs, structure, dirFileTemplates, dirDestination } = configData;

const dirProjectDestination = joinPathes(dirProject, dirDestination);

if (!fs.existsSync(dirProjectDestination)) {
  printErrorMessage(`Destination folder "${dirProjectDestination}" does not exist!`);
}

const configTypeString = types[argsType];

if (!configTypeString) {
  printErrorMessage(`No such type: ${argsType} in config file!`);
}

const configTypeValues = splitString(configTypeString, TYPE_VALUE_SEPARATOR);

const argsTypeValues = splitString(argsTypeString, TYPE_VALUE_SEPARATOR);

if (argsTypeValues.length < configTypeValues.length) {
  printErrorMessage(`Type value "${argsTypeString}" does not match value "${configTypeString}" in config file!`);
}

const argsValues = configTypeValues
  .reduce((acc, paramName, idx) => {
    const valueFromArgs = argsTypeValues[idx];

    return valueFromArgs ? { ...acc, [paramName]: valueFromArgs } : acc;
  }, {});

// total params to replace in strings and templates
const replaceValues = {
  ...staticReplacePairs,
  ...argsValues,
};

const createDir = (dirPath) => {
  const parentPath = dirProjectDestination;
  const finalPath = substituteDirPath(dirPath);
  const finalPathParts = splitString(finalPath, TYPE_VALUE_SEPARATOR);
  const tempPathParts = [];

  finalPathParts.forEach(part => {
    tempPathParts.push(part);
    const currentResolvePath = path.resolve(parentPath, ...tempPathParts);
    if (!fs.existsSync(currentResolvePath)) {
      fs.mkdirSync(currentResolvePath);
    }
  });
};

const getFileFullPath = (parentPath, filePath) => joinPathes(
  dirProjectDestination,
  parentPath,
  filePath,
);

const getTemplateFileFullPath = (templateFilePath) => joinPathes(
  dirProject,
  dirFileTemplates,
  templateFilePath,
);

const createFileFullPath = (dirPath, filePath) => {
  const finalDirPath = substituteDirPath(dirPath);
  const finalFilePath = substituteFilePath(filePath);
  return getFileFullPath(finalDirPath, finalFilePath);
};

const createFileFromTemplate = (templateFilePath, filePath) => {
  if (!fs.existsSync(templateFilePath)) {
    printWarnMessage(`Template file ${templateFilePath} does not exist!`);
    return;
  }

  if (fs.existsSync(filePath)) {
    printWarnMessage(`Destination file ${filePath} is already exist and will be skipped!`);
    return;
  }

  try {
    const templateData = fs.readFileSync(templateFilePath, 'utf8');
    const fileData = substituteFileContent(templateData);
    fs.writeFileSync(filePath, fileData);
  } catch (error) {
    printError(error);
  }
};

const parseFiles = (folder, filesObject) => {
  if (!filesObject || !Object.keys(filesObject).length) {
    return;
  }

  Object.entries(filesObject)
    .forEach(([templateName, fileName]) => {
      const templatePath = getTemplateFileFullPath(templateName);
      const filePath = createFileFullPath(folder, fileName);
      createFileFromTemplate(templatePath, filePath);
    });
};

const parseFolders = (structure) => {
  Object.entries(structure)
    .forEach(([folder, filesObject]) => {
      createDir(folder);
      parseFiles(folder, filesObject);
    });
};

const createType = (type) => {
  const typeStructure = structure[type];

  if (!typeStructure) {
    printErrorMessage(`No structure for type: ${type} in config file!`);
  }

  parseFolders(typeStructure);
};

try {
  // main function
  createType(argsType);
} catch(error) {
  printError(error);
}

printMessage(`DONE!`);
