# Santiago's dotfiles

These are my dotfiles.

It uses [dotbot](https://github.com/anishathalye/dotbot).

## Prerequisites

* cURL
* Git
* Python and Pip
* Wget
* zip and unzip (for SDKMAN!)

You can install them in Ubuntu 20.04 with:

```bash
sudo apt install curl git python-is-python3 python3 unzip wget zip
```

## Installation

First check the existing dotfiles in the system home directory and delete them. Then:

```bash
git clone --recursive https://github.com/bryant1410/dotfiles
cd dotfiles

./install
```

This is specialized on Linux, but may also work in other \*nix envs.

### Main Computer

These are additional steps for a computer I actively use (a "main" one), has Ubuntu and I have sudo access. It requires Python 3.5+. Run:

```bash
sudo ./install -p dotbot-apt/apt.py -c main_run_with_sudo.conf.yaml
./install -c main_run_without_sudo.conf.yaml
```

This is specialized on Ubuntu.

#### Post-installation Steps

1. Steam may be shown as it failed because it actually is waiting for a user to continue from some GUI.

2. Run the following to finish the Docker installation:

    ```bash
    sudo usermod -aG docker $USER
    ```

3. Run the following to finish the Dropbox installation:

    ```bash
    ~/.dropbox-dist/dropboxd
    ```

4. Set "JetBrains Mono Regular" as the font for the system Terminal, Sublime, VS Code, and Guake. Enable the font ligatures wherever possible.

5. Enable settings sync in the JetBrains IDEs.

6. Add Guake to the list of Startup Applications.

7. Install and set up Prey:

    ```bash
    TEMP_DEB=$(mktemp) && wget -O "$TEMP_DEB" 'https://downloads.preyproject.com/prey-client-releases/node-client/1.9.9/prey_1.9.9_amd64.deb' && sudo dpkg --skip-same-version -i "$TEMP_DEB" && rm -f "$TEMP_DEB"
    sudo apt --fix-broken -y install  # Install Prey dependencies.
    ```

8. Symlink `Pictures` to `Dropbox/Pictures`:

    ```bash
    rmdir ~/Pictures/
    ln -s Dropbox/Pictures ~/Pictures
    ```

9. Symlink the Sublime user packages to the ones in `Dropbox/Sublime` (see more in https://stackoverflow.com/a/11399206/1165181):

    ```bash
    rm -rf ~/.config/sublime-text-3/Packages/User
    ln -s ~/Dropbox/Sublime/Packages/User ~/.config/sublime-text-3/Packages/User
    ```

10. Make Calibre use the library in `Dropbox/Calibre`.

11. Log out and log back in for Docker to work without sudo.

12. Set up the local bashrc file:

    ```bash
    ln -s ~/Dropbox/.bashrc.local .bashrc.local
    ```

## About the Git Configuration

I save the git config in a 2nd user-specific path (`~/.config/git/config`), so I can override stuff in the local machine (in `~/.gitconfig`), such as the email. 

## If bash gets slow to load

To debug the `~/.bashrc` file when opening a new terminal gets slow, see [this gist](https://gist.github.com/bryant1410/fa9c595c599afa763f055ee72b2f7944).
