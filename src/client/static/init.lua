local path = minetest.get_modpath(minetest.get_current_modname())

dofile(path .. '/metatable_polyfill.lua')

setmetatable(_G, nil)
dofile(path .. '/client_bundle.lua')
