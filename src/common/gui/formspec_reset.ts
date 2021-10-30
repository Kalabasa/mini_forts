const common = 'noclip=true';

// remove the ugly Minetest look
export const formspecReset = [
  'bgcolor[;neither;]',
  `style_type[button,image_button;${common};border=false;bgcolor=#00000000;alpha=true;content_offset=0,0]`,
  `style_type[button:hovered+pressed,image_button:hovered+pressed;content_offset=0,0]`,
].join('\n');
