# Santiago's dotfiles

These are my dotfiles.

It uses [dotbot](https://github.com/anishathalye/dotbot).

## Prerequisites

* cURL
* Git
* Python and Pip
* Wget

## Installation

First check the existing dotfiles in the system home directory and delete them. Then:

```bash
git clone https://github.com/bryant1410/dotfiles
cd dotfiles

./install
```

### Main Computer

These are additional steps for a computer I actively use (a "main" one), has Ubuntu and I have sudo access. It requires Python 3 or Python 2 with the package `enum34` installed. Run:

```bash
git submodule update --init --recursive dotbot-apt-get
sudo ./install -p dotbot-apt-get/aptget.py -c main_run_with_sudo.conf.yaml
./install -c main_run_without_sudo.conf.yaml
```

#### Post-installation Steps

1. Run the following to finish the Docker installation:

    ```bash
    sudo usermod -aG docker $USER
    ```

2. Run the following to finish the Dropbox installation:

    ```bash
    ~/.dropbox-dist/dropboxd
    ```

3. Set "JetBrains Mono Regular for Powerline" as the font for the system Terminal, Sublime, VS Code, IntelliJ-based programs, and Guake. Enable the font ligatures wherever possible.

4. Add Guake to the list of Startup Applications.

5. Install and set up Prey:

    ```bash
    TEMP_DEB=$(mktemp) && wget -O "$TEMP_DEB" 'https://downloads.preyproject.com/prey-client-releases/node-client/1.9.2/prey_1.9.2_amd64.deb' && sudo dpkg --skip-same-version -i "$TEMP_DEB" && rm -f "$TEMP_DEB"
    sudo apt --fix-broken -y install  # Install Prey dependencies.
    ```

6. Log out and log back in for Docker to work without sudo.

## About the Git Configuration

I save the git config in a 2nd user-specific path (`~/.config/git/config`), so I can override stuff in the local machine (in `~/.gitconfig`), such as the email. 

## If bash gets slow to load

To debug the `~/.bashrc` file when opening a new terminal gets slow, see [this gist](https://gist.github.com/bryant1410/fa9c595c599afa763f055ee72b2f7944).
