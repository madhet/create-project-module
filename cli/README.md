# create-project-module

## Basic concepts
---
Create you own project modules like components, pages and etc. with all the needed file structures.

- describe all the needed module types and structures for them into `cpm.config.json`;
- create your own file templates that will be used as sketches for new module files;
- use `[[]]` in pathes and file templates to mark patterns for replacement during creation.

## Run command
---
`npm run cpm [type-id] [type-value]`

*[type-id]* - type identifier. 

Must be present in config file. Identifier for created module. Must have corresponded value.

*[type-value]* - type name and\or basic structure for nested modules. 

Must be present in config file. Using as name for folders and files. Can be multiple values separated by "/".

E. g.:

    npm run cpm feature my-feature

Create module "feature" with name "my-feature".

    npm run cpm widget my-feature/my-widget

Create module "widget" with name "my-widget" that belongs to some module with name "my-feature".  

## Config file cpm.config.json structure
---
{  
`dirFileTemplates: String`

Folder with file templates. Path is relative to current project folder.

    "dirFileTemplates": "/cli/file-templates",

`dirDestination: String`

Folder to save all created modules. Path is relative to current project folder.

    "dirDestination": "/src/test",

`types: Object`

Types and type's values to identify the created modules.

`{ [type-id]: "typeValue": String }`

`[type-id]` - type identifier, the same as *[type-id]* param from command line.

`"typeValue"` - type value, corresponds to *[type-value]* param from command line.

Can be multiple values separated by "/". Must contain patternString, command line param will be replacementString (see `"staticReplacePairs"` bellow).

    "types": {
      "feature": "nameFeature",
      "component": "nameFeature/nameComponent"
    },

`staticReplacePairs: Object`

Contains some patterns and replacements for folder/file names and file content.

`{ "patternString": "replacementString": String }`

`"patternString"` - pattern string.

`"replacementString"` - replacement string.

Type values from `"types"` object will be parsed as patterns and corresponded params from command line as replacements during runtime. `"staticReplacePairs"` will be added to them. Patterns must be enclosed in **[[ ]]**.

    "staticReplacePairs": {
      "patternString": "replacementString",
      "nameFeature": "",
      "nameComponent": ""
    },

`structure: Object`

Describes file structure for each module. Must contains all types from `"types"` object.
 
`{ [type-id]: "foldersObject": Object }`
 
`[type-id]` - type identifier (similar to `"types"`).
 
`"foldersObject"` - object with the folders description:

`{ "folderPath": "filesObject": Object }`

`"folderPath"` - folder path. Path is relative to `"dirDestination"`.

Created recursively, so can be maximum nesting. Can contain patterns for replacing that must be enclosed in **[[ ]]** and described in `"types"` as type values or `"staticReplacePairs"`.

`"filesObject"` - object with files description:

`{ "templateFilePath": "destinationFilePath": String }`

`"templateFilePath"` - template file path/name. Path is relative to `"dirFileTemplates"`.

`"destinationFilePath"` - new file path/name. Path is relative to `"folderPath"`.

Can contain patterns for replacing. Replacements will be transform to PascalCase.

Content of `"templateFilePath"` will be copied to `"destinationFilePath"` with all needed replacements.

    "structure": {
      "feature": {
        "features/[[nameFeature]]/application/context": {},
        "features/[[nameFeature]]/application/components": {},
      },
      "component": {
        "features/[[nameFeature]]/application/components/[[nameComponent]]": {
          "component.template.jsx": "[[nameComponent]].jsx",
          "componentStyled.template.js": "[[nameComponent]]Styled.js",
          "component.test.template.js": "[[nameComponent]].test.js"
       }
      }
    }
}
