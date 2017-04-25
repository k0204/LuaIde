import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from './TokenInfo';
import { LuaParse } from './LuaParse'
import { CLog } from './Utils'
import { ExtensionManager } from "../luatool/ex/ExtensionManager"
export class LuaFuncitonCheck {
    private lp: LuaParse;

    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    /**
     * 检查if 语句
     */
    public check(): boolean {
        var functionToken: TokenInfo = this.lp.getCurrentToken("代码未完成")
        if (this.lp.isError) return;
        if (this.lp.consume('function', functionToken, TokenTypes.Keyword)) {

            return this.checkGlobalFunction(functionToken);

        } else {
            if (this.checkIsLocal()) {
                var functionToken1: TokenInfo = this.lp.getTokenByIndex(this.lp.tokenIndex + 1, "代码未完成");
                if (this.lp.consume('function', functionToken1, TokenTypes.Keyword)) {
                    this.lp.tokenIndex++;

                    return this.checkLocalFunction(null, functionToken.comments);

                }
            }
        }
        return false
    }

    private currentFunLuaInfo: LuaInfo;
    public checkGlobalFunction(functionToken: TokenInfo): boolean {

        var luaInfo: LuaInfo = new LuaInfo(this.lp.getTokenByIndex(this.lp.tokenIndex + 1, "funcito 未完成"));
        luaInfo.type = LuaInfoType.Function;
        // luaInfo.name = "";
        if (functionToken.comments && functionToken.comments.length > 0) {
            luaInfo.startToken.comments = functionToken.comments
            luaInfo.setComments(functionToken.comments)
        }
        while (true) {
            CLog();
            var token: TokenInfo = this.lp.getNextToken("function 未完成")

            // luaInfo.name = luaInfo.name + token.value;
            if (token.type == TokenTypes.Identifier) {
                var nextToken: TokenInfo = this.lp.getNextToken("function 未完成")
                if (this.lp.consume('.', nextToken, TokenTypes.Punctuator)) {
                    //  luaInfo.name = luaInfo.name+".";

                    continue;
                } else if (this.lp.consume(':', nextToken, TokenTypes.Punctuator)) {
                    // luaInfo.name = luaInfo.name +":"
                    if (ExtensionManager.em.luaIdeConfigManager.moduleFunNestingCheck) {
                        if (this.currentFunLuaInfo) {
                            this.lp.setError(token, "module 方法出现嵌套", this.currentFunLuaInfo.startToken);
                            return
                        }
                        this.currentFunLuaInfo = luaInfo
                        var funResult = this.checkLocalFunction(luaInfo, functionToken.comments);
                        this.currentFunLuaInfo = null
                        return funResult
                    }
                    else {
                        var funResult = this.checkLocalFunction(luaInfo, functionToken.comments);

                        return funResult
                    }

                } else if (this.lp.consume('(', nextToken, TokenTypes.Punctuator)) {
                    this.lp.tokenIndex--;
                    var endToken: TokenInfo = this.lp.getCurrentToken(null);
                    var returnValue = this.lp.luaFunctionParse.check(luaInfo, true, null)
                    this.lp.luaInfoManager.addFunctionCompletionItem(luaInfo, endToken, this.lp.getUpToken())

                    return returnValue

                }
                else {
                    this.lp.setError(token, "function 意外的字符");
                    return false
                }
            } else {
                this.lp.setError(token, "function 意外的字符");
                return false
            }
        }


    }

    public checkLocalFunction(luaInfo: LuaInfo, comments: Array<LuaComment>): boolean {
        var token: TokenInfo = this.lp.getNextToken("function 未完成")
        if (luaInfo == null) {
            luaInfo = new LuaInfo(token);
            luaInfo.isLocal = true

            luaInfo.setComments(comments)
        }



        if (token.type == TokenTypes.Identifier) {

            var endToken: TokenInfo = this.lp.getCurrentToken(null)


            var result: boolean = this.lp.luaFunctionParse.check(luaInfo, true, null)

            this.lp.luaInfoManager.addFunctionCompletionItem(luaInfo, endToken, this.lp.getUpToken())

            return result
        } else {
            this.lp.setError(token, "function 意外的字符");
            return false
        }
    }

    /**
     * 是否是local
     */
    public checkIsLocal(): boolean {
        var token = this.lp.getCurrentToken("代码未完成");
        if (this.lp.isError) return false
        var isLocal: boolean = this.lp.consume('local', token, TokenTypes.Keyword)

        return isLocal;
    }
}