local path = minetest.get_modpath(minetest.get_current_modname())
setmetatable(_G, nil)
dofile(path .. '/server_bundle.lua')
