--
--版权所有:{company}
-- Author:{author}
-- Date: {time}
--
local {moduleName} = class("{moduleName}")
function  {moduleName}:ctor()
    self:loadCCS("UI/test/bag.json")
    self:registerVarsByNames(self,vars)
    self:registerBtns({
        self.btnHero,
        self.btnEquipment,
        self.btnProps,
    },function(sender) 
        self:buttonClick(sender)    
    end)
end
--desc:
--Author:{author}
--date:{time}
function  {moduleName}:buttonClick(sender)
    
end
function  {moduleName}:test1()
   
end
return  {moduleName}
