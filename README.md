# Santiago's dotfiles

These are my dotfiles.

It uses [dotbot](https://github.com/anishathalye/dotbot).

## Installation

First check the existing dotfiles in the system home directory and delete them. Then:

```bash
git clone https://github.com/bryant1410/dotfiles
cd dotfiles

./install
```

### Main Computer

In a computer I actively use (a "main" one), has Ubuntu and I have sudo access, also run:

```bash
git submodule update --init --recursive dotbot-apt-get
sudo ./install -p dotbot-apt-get/aptget.py -c main_run_with_sudo.conf.yaml
./install -c main_run_without_sudo.conf.yaml
```

TODO: pyenv and/or miniconda
TODO: prey, [globus](https://downloads.globus.org/globus-connect-personal/v3/linux/stable/globusconnectpersonal-latest.tgz)

#### Post-installation Steps

Run the following to finish the Dropbox installation:

```bash
~/.dropbox-dist/dropboxd
```

Run the following to finish the Docker installation:

```bash
sudo usermod -aG docker $USER
```

Then log out and log back in for Docker to work without sudo.

## About the Git Configuration

I save the git config in a 2nd user-specific path (`~/.config/git/config`), so I can override stuff in the local machine (in `~/.gitconfig`), such as the email. 
