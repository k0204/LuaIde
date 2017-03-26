import vscode = require('vscode');
'use strict';
var fs = require('fs');
var path = require('path');
var os = require('os');
import { ExtensionManager } from '../ExtensionManager';
import * as ExFileUtils from '../ExFileUtils';
import * as Utils from '../../Utils';
import cp = require('child_process');
export class TemplateManager {


    private fTemplate: Array<string>;
    private paths: Array<string> = new Array<string>();
    private functionDocs: Array<string> = new Array<string>();

    private userFileTemplate: string = null;
    private isUserFuncctionPath: boolean = false
    private defaultFunTempl: string = "";
    constructor() {
        this.InitTemplate()
    }
    public InitTemplate() {
        this.fTemplate = [
            "CreateModuleFunctionTemplate.lua",
            "CreateFunctionTemplate.lua",
        ];
        var extensionPath = vscode.extensions.getExtension("kangping.luaide").extensionPath
        this.defaultFunTempl = path.join(extensionPath, 'Template', 'funTemplate');

        //检查
        var dir: string = this.getTemplatesDir();
        if (dir) {
            var fileTemplate = path.join(dir, "FileTemplates")
            this.userFileTemplate = fileTemplate
            if (!fs.existsSync(fileTemplate)) {
                //判断是否有模板文件夹
                if (!fs.existsSync(this.userFileTemplate)) {
                    var creats = fs.mkdirSync(this.userFileTemplate, '0755');
                }

            }
            //检查function 目录
            var funcitonTemplates: string = path.join(dir, 'FunTemplate')
            if (!fs.existsSync(funcitonTemplates)) {
                var creats = fs.mkdirSync(funcitonTemplates, '0755');
            }
            this.copyFunTemplate(funcitonTemplates);
        }
        this.initFunTemplateConfig();

    }


    private copyFunTemplate(funPath: string) {
        var isChange: boolean = true
        for (var i = 0; i < this.fTemplate.length; i++) {
            var filePath: string = path.join(funPath, this.fTemplate[i])
            if (!fs.existsSync(filePath)) {
                var src = path.join(this.defaultFunTempl, this.fTemplate[i])
                try {
                    fs.writeFileSync(filePath, fs.readFileSync(src));
                } catch (err) {
                    isChange = false
                }
            }
        }
        if (isChange) {
            this.defaultFunTempl = funPath;
        }


    }


    private initFunTemplateConfig() {
        for (var i = 0; i < this.fTemplate.length; i++) {
            var fpath = path.join(this.defaultFunTempl, this.fTemplate[i]);
            this.paths.push(fpath);
        }
        this.loadText(0)
    }
    public getTemplate(filename) {

        var contentText = fs.readFileSync(path.join(this.userFileTemplate, filename), 'utf-8');
        return contentText;
    };
    public loadText(index: number) {
        if (index < this.paths.length) {
            var path: string = this.paths[index]
            vscode.workspace.openTextDocument(path).then(
                doc => {
                    this.functionDocs.push(doc.getText())
                    index = index + 1;
                    this.loadText(index)
                });
        }
    }
    public getTemplateText(index: number) {
        return this.functionDocs[index]
    }
    public getTemplates(): Array<string> {

        if (this.userFileTemplate) {

            if (fs.existsSync(this.userFileTemplate)) {
                var rootPath = this.userFileTemplate
                var templateFiles = fs.readdirSync(rootPath).map(function (item) {
                    return fs.statSync(path.join(rootPath, item)).isFile() ? item : null;
                }).filter(function (filename) {
                    return filename !== null;
                });
                return templateFiles;
            }
        }
        return null;
    };

    public chekFileTemplatesDir(): boolean {
        if (this.userFileTemplate) {
            return true
        } else {
            return false
        }
    }
    public getTemplatesDir(): string {
        return ExtensionManager.em.luaIdeConfigManager.luaTemplatesDir
    }





}