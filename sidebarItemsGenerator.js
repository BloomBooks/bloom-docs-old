module.exports = async function ({ defaultSidebarItemsGenerator, ...args }) {
  const sidebarItems = await defaultSidebarItemsGenerator(args);

  return hideTransparentFolders(sidebarItems);
};

// In order to keep images nearby to markdown and not lose links to them if we rename things, we
// can wrap each file in a folder that contains the MD and the images. However, sometimes this
// is not a natural category, so we wan that folder to be "transparent".  Our convention is to
// indicate that we want the folder to be transparent by appending "-" to the folder.
function hideTransparentFolders(items) {
  if (!items) {
    return items;
  }
  return items.flatMap((item) => {
    if (
      item.type === "category" &&
      item.label.indexOf("-") === item.label.length - 1 // name ends in our transparent folder indicator
    ) {
      return item.items;
    }
    if (item.items) {
      return {
        ...item,
        items: hideTransparentFolders(item.items),
      };
    } else {
      return item;
    }
  });
}
