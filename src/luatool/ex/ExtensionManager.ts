/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, window, TextDocumentChangeEvent } from 'vscode';
import vscode = require('vscode');
import * as cce from '../ex/ChangeCaseExtension';
import * as cmf from '../ex/CreateMoudleFunction';
import * as CreateFunction from '../ex/CreateFunction';
import { LuaIdeConfigManager } from '../ex/LuaIdeConfigManager';
import { TemplateManager } from '../ex/Template/TemplateManager';
import { CreateTemplateFile } from '../ex/Template/CreateTemplateFile'
import { OpenLuaLuaScriptText } from '../ex/LoadLuaScript'


export class ExtensionManager {
    public static em: ExtensionManager;
    constructor(context: ExtensionContext) {
        ExtensionManager.em = this;
        this.InitEx(context)
    }
    public golbal = { context: null }
    public COMMAND_LABELS = {
        toUpperCase: 'toUpperCase',
        toLowerCase: 'toLowerCase',
        createModuleFunction: 'createModuleFunction',
        createFunction: "createFunction",
        createTemplateFile: "createTemplateFile",
        LoadLuaScript: "LoadLuaScript",


    };
    public COMMAND_DEFINITIONS = [
        { label: this.COMMAND_LABELS.toUpperCase, description: '转换为大写', func: cce.toUpperCase },
        { label: this.COMMAND_LABELS.toLowerCase, description: '转换为小写', func: cce.toLowerCase },
        { label: this.COMMAND_LABELS.createModuleFunction, description: '创建模块方法', func: cmf.createModuleFunction },
        { label: this.COMMAND_LABELS.createFunction, description: '创建方法', func: CreateFunction.createFunction },
        { label: this.COMMAND_LABELS.createTemplateFile, description: '创建模板文件', func: CreateTemplateFile.run },
        { label: this.COMMAND_LABELS.LoadLuaScript, description: '加载lua字符串', func: OpenLuaLuaScriptText },
    ];

    public TemplatePath = {
        CreateModuleFunctionTemplate: "Template\\CreateModuleFunctionTemplate.lua",
        CreateFunctionTemplate: "Template\\CreateFunctionTemplate.lua",
    }
    public luaIdeConfigManager: LuaIdeConfigManager;
    public templateManager: TemplateManager;
    public InitEx(context: ExtensionContext) {
        this.golbal.context = context;
        this.luaIdeConfigManager = new LuaIdeConfigManager();
        this.templateManager = new TemplateManager();
        this.luaIdeConfigManager.showRecharge();

        vscode.commands.registerCommand('luaide.changecase.toLowerCase', () => { this.RunCommand(this.COMMAND_LABELS.toLowerCase) });
        vscode.commands.registerCommand('luaide.changecase.toUpperCase', () => { this.RunCommand(this.COMMAND_LABELS.toUpperCase) });
        vscode.commands.registerCommand('luaide.utils.createModuleFunction', () => { this.RunCommand(this.COMMAND_LABELS.createModuleFunction) });
        vscode.commands.registerCommand('luaide.utils.createFunction', () => { this.RunCommand(this.COMMAND_LABELS.createFunction) });
        vscode.commands.registerCommand('luaide.utils.createTemplateFile', () => { this.RunCommand(this.COMMAND_LABELS.createTemplateFile) });
        vscode.commands.registerCommand('luaide.utils.LoadLuaScript', () => { this.RunCommand(this.COMMAND_LABELS.LoadLuaScript) });

    }
    private RunCommand(cmd) {
        for (var i = 0; i < this.COMMAND_DEFINITIONS.length; i++) {
            if (this.COMMAND_DEFINITIONS[i].label == cmd) {
                this.COMMAND_DEFINITIONS[i].func()
                break;
            }
        }
        // getTemplateText(TemplatePath.CreateModuleFunctionTemplate)
    }



}