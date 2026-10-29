# Engine families

Signatures to recognise an engine from an install folder. Hints, not proof: confirm with exe
strings or documentation, and write down how you know. Contributions welcome: add the
families you meet, with sources.

The machine-readable version is [`data/engines.yaml`](../data/engines.yaml), used by the MCP
server's `detect_engine` tool. Change both together, and add a source to a family's `sources`
when you confirm its signatures.

| Engine family | Typical signs | Remaster notes |
|---|---|---|
| Unreal Engine 1 (1998-2002) | `System/` folder, `.u` `.utx` `.uax` `.umx` packages, `.int` files, renderer set in the game's `.ini` | Pluggable renderers: newer community renderers are often the main display upgrade. Textures live in packages. |
| Unreal Engine 2 / 2.5 | `.u` `.utx` `.usx` `.ukx` packages, `System/` folder | Similar package-based workflow to UE1. |
| Unreal Engine 3 | `.upk` / `.u` packages, `CookedPC` folder | Cooked packages; texture injection usually easier than repacking. |
| GoldSrc | `.wad` `.bsp`, `valve/` folder | |
| Source | `.vpk` archives, `gameinfo.txt`, `.vtf` textures | Loose files usually override archives. |
| id Tech 2 / 3 | `.pak` (id Tech 2), `.pk3` zip archives (id Tech 3) | Many open source ports exist; check before patching the original. |
| Gamebryo / NetImmerse | `.nif` models, `.bsa` archives (Bethesda), `.esm/.esp` | Loose files often override archives. |
| RenderWare | `.txd` textures, `.dff` models, `.img` archives | |
| IW engine (Call of Duty) | `.ff` fastfiles, `.iwd` archives | Proprietary packed assets: extraction needs community tools. |
| Odyssey / Infinity Engine (BioWare) | `chitin.key`, `.bif` archives (`.tpc` textures for Odyssey) | Tell them apart by exe and formats. |
| Unity | `UnityPlayer.dll`, `<Game>_Data/` folder | Mod loaders (BepInEx, MelonLoader) for display fixes. |
| Unreal Engine 4 / 5 | `.pak` / `.utoc` files, `Engine/` and `<Game>/Binaries/` | Usually not a remaster target (already modern). |
| Unknown | none of the above | Exe strings, imports, file magic numbers; REA can help. |
