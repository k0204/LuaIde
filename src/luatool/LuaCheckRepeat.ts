import { LuaInfo, TokenInfo, TokenTypes, LuaComment, LuaRange, LuaErrorEnum, LuaError, LuaInfoType } from './TokenInfo';
import { LuaParse } from './LuaParse'
export class LuaCheckRepeat {
    private lp: LuaParse;
    constructor(luaparse: LuaParse) {
        this.lp = luaparse;
    }

    /**
     * 检查if 语句
     */
    public check(): boolean {

        var token: TokenInfo = this.lp.getCurrentToken(null)
        if (token == null) return true
        if (this.lp.consume('repeat', token, TokenTypes.Keyword)) {
            var luaInfo: LuaInfo = new LuaInfo(this.lp.getCurrentToken(null))
            this.lp.tokenIndex++;

            var returnValue: any = this.lp.setLuaInfo(luaInfo,
                function (luaParse: LuaParse): any {

                    var token: TokenInfo = luaParse.getTokenByIndex(luaParse.tokenIndex, "代码未完成")
                    if (luaParse.isError) return false
                    if (luaParse.consume('until', token, TokenTypes.Keyword)) {
                        var ul: LuaInfo = new LuaInfo(token)
                        luaParse.tokenIndex++;
                        luaParse.luaSetValue.check(true, true, null)
                        if (luaParse.isError) return false

                        luaParse.tokenIndex++;

                        return true
                    }
                    return false
                }, null)
            return returnValue

        } else return false

    }
}