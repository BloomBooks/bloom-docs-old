This is currently an experiment in using Docusaurus for Bloom documentation.



## Prerequisites
* A Github account
* [VSCode](https://code.visualstudio.com/download)
* [NodeJS](https://nodejs.org/en/download/)

## Getting Started

1. Clone this to your own github account.

1. Open the folder in VSCode.
VSCode should recommend that you add two extensions:
    * [Paste Image](https://github.com/mushanshitiancai/vscode-paste-image)
    * [Grammarly](https://github.com/znck/grammarly)

1. Open a terminal (Ctrl + Shift + `)
1. Type `npm run start`

That should open up the site in a browser for you.

## Editing a Document
Now go to the `docs` directory and edit one of the documents you see there. When you save, the browser should show your changes.

## Adding Screenshots
To add a screenshot, use CTRL + Alt + v. This tells the [Paste Image](https://github.com/mushanshitiancai/vscode-paste-image) extension to save the image to an "img" directory next to the current file and insert the markdown the way Docusaurus wants it. 

## Keeping Images and Text Together
In order to create a folder that only exists to keeps various MD files together with a single "img" folder, create a folder and end it with a dash. This folder will make a new level in the sidebar. (Our custom sidebarItemsGenerator understands this dash).