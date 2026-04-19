{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    zig-overlay = {
      url = "github:mitchellh/zig-overlay";
      # inputs.nixpkgs.follows = "nixpkgs";
    };
    zls = {
      url = "github:zigtools/zls/0.16.0";
      # inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      zig-overlay,
      zls,
    }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
      zig-version = "0.16.0";
      zig = zig-overlay.packages.${system}.${zig-version};
    in
    {
      devShells.${system}.default = pkgs.callPackage (
        { mkShell }:
        mkShell {
          nativeBuildInputs = [
            zig
            zls.packages.${system}.zls
          ];
        }
      ) { };
    };
}
