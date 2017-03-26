'use strict';
import {Range} from 'vscode-languageclient';
/**
 * 提示
 */
 export default class LuaComment
{
   constructor(content,range:Range)
   {
       this.content = content;
       this.range = range;
   }
   public content:string = null;
   public range:Range =null;

}