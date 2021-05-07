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

const substituteString = (str, replacePairs, options = {}) => {
  const { pascal } = options;

  return str.replace(/\[\[(\w+)\]\]/g, (_, p1) => {
    const replacement = replacePairs[p1];

    if (!replacement) {
      return '';
    }

    return pascal ? toPascalCase(replacement) : replacement ;
  });
};

const substituteDirPath = (path, replacePairs) => {
  return substituteString(path, replacePairs);
};

const substituteFilePath = (path, replacePairs) => {
  return substituteString(path, replacePairs, { pascal: true });
};

const substituteFileContent = (fileData, replacePairs) => {
  return substituteString(fileData, replacePairs, { pascal: true });
};

const getConfigFromFile = () => {
  // name for config file
  const CONFIG_FILE_NAME = 'cpm.config.json';
  // path to cli folder
  const dirCli = __dirname;
  // path to config file
  const configPath = joinPathes(dirCli, CONFIG_FILE_NAME);
  
  // check if config file exists
  if (!fs.existsSync(configPath)) {
    printErrorMessage(`Can't find "${CONFIG_FILE_NAME}" at ${configPath}!`);
  }

  // read from config file
  try {
    const configJson = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configJson);
  } catch (error) {
    printError(error);
  }
};

const isTypeValueValid = (checkedTypeString, configTypeString) => {
  if (!checkedTypeString || !configTypeString) {
    return false;
  }

  const configTypeValues = splitString(configTypeString, TYPE_VALUE_SEPARATOR);

  const checkedTypeValues = splitString(checkedTypeString, TYPE_VALUE_SEPARATOR);

  return checkedTypeValues.length >= configTypeValues.length;
};

const getCommandLineArgs = async (args, config) => {
  const readline = require("readline");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = (questionText) => new Promise((resolve) => {
    rl.question(questionText, (input) => {
      resolve(input);
      rl.pause();
    });
  });

  // get type name and value from comand line args
  let [
    ,               // path to node
    ,               // path to executed js file
    argsType,       // type for config.types
    argsTypeString, // value for config.types[type]
  ] = args;

  // get types from config
  const {
    types,
  } = config;

  // check argsType exist and has valid value
  while (!argsType || !types[argsType]) {
    if (argsType && !types[argsType]) {
      printWarnMessage(`No such type "${argsType}" in config file!`);
    }
    argsType = await prompt('Please provide required parameter [type]: ');
  }

  // get type value from config
  const configTypeString = types[argsType];

  // check argsTypeString exist and has valid value
  while (!argsTypeString || !isTypeValueValid(argsTypeString, configTypeString)) {
    if (argsTypeString && !isTypeValueValid(argsTypeString, configTypeString)) {
      printWarnMessage(`Type value "${argsTypeString}" does not match value "${configTypeString}" in config file!`);
    }
    argsTypeString = await prompt('Please provide required parameter [type-value]: ');
  }

  rl.close();

  return {
    argsType,
    argsTypeString,
  };
};

const getReplacePairs = (argsType, argsTypeString, fileConfig) => {
  const {
    types,
    staticReplacePairs,
  } = fileConfig;

  // get type value from config
  const configTypeString = types[argsType];

  const configTypeValues = splitString(configTypeString, TYPE_VALUE_SEPARATOR);

  const argsTypeValues = splitString(argsTypeString, TYPE_VALUE_SEPARATOR);

  const argsReplacePairs = configTypeValues
    .reduce((acc, paramName, idx) => {
      const valueFromArgs = argsTypeValues[idx];

      return valueFromArgs ? { ...acc, [paramName]: valueFromArgs } : acc;
    }, {});

  return {
    ...staticReplacePairs,
    ...argsReplacePairs,
  };
};

const getFullConfig = (argsType, argsTypeString, fileConfig) => {
  // path to project root folder
  const dirProject = path.resolve('');

  const replacePairs = getReplacePairs(argsType, argsTypeString, fileConfig);

  const { dirDestination } = fileConfig;

  // path to destination folder
  const dirProjectDestination = joinPathes(dirProject, dirDestination);

  // check if destination folder exists
  if (!fs.existsSync(dirProjectDestination)) {
    printErrorMessage(`Destination folder "${dirProjectDestination}" does not exist!`);
  }

  return {
    ...fileConfig,
    replacePairs,
    dirProject,
    dirProjectDestination,
  };
};

const getTemplateFileFullPath = (templateFilePath, config = {}) => {
  const { dirProject, dirFileTemplates } = config;

  return joinPathes(
    dirProject,
    dirFileTemplates,
    templateFilePath,
  );
};

const getDistanationFileFullPath = (dirPath, filePath, config = {}) => {
  const { replacePairs, dirProjectDestination } = config;
  const finalDirPath = substituteDirPath(dirPath, replacePairs);
  const finalFilePath = substituteFilePath(filePath, replacePairs);

  return joinPathes(
    dirProjectDestination,
    finalDirPath,
    finalFilePath,
  );
};

const createFileFromTemplate = (templateFilePath, filePath, config = {}) => {
  const { replacePairs } = config;

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
    const fileData = substituteFileContent(templateData, replacePairs);
    fs.writeFileSync(filePath, fileData);
  } catch (error) {
    printError(error);
  }
};

const parseFiles = (folder, filesObject, config) => {
  if (!filesObject || !Object.keys(filesObject).length) {
    return;
  }

  Object
    .entries(filesObject)
    .forEach(([templateName, fileName]) => {
      const templatePath = getTemplateFileFullPath(templateName, config);
      const filePath = getDistanationFileFullPath(folder, fileName, config);
      createFileFromTemplate(templatePath, filePath, config);
    });
};

const createDir = (dirPath, config = {}) => {
  const { dirProjectDestination, replacePairs } = config;

  const parentPath = dirProjectDestination;
  const finalPath = substituteDirPath(dirPath, replacePairs);
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

const parseFolders = (structure, config) => {
  Object
    .entries(structure)
    .forEach(([folder, filesObject]) => {
      createDir(folder, config);
      parseFiles(folder, filesObject, config);
    });
};

const createType = (type, config = {}) => {
  const { structure } = config;

  const typeStructure = structure[type];

  if (!typeStructure) {
    printErrorMessage(`No structure for type: ${type} in config file!`);
  }

  parseFolders(typeStructure, config);
};

// main function definition
const main = async (args) => {
  const fileConfig = getConfigFromFile();

  const { argsType, argsTypeString } = await getCommandLineArgs(args, fileConfig);

  const fullConfig = getFullConfig(argsType, argsTypeString, fileConfig);

  try {
    createType(argsType, fullConfig);
  } catch(error) {
    printError(error);
  }

  printMessage(`DONE!`);
};

main(process.argv);
