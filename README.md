# Santiago's dotfiles

These are my dotfiles.

It uses [dotbot](https://github.com/anishathalye/dotbot).

## Installation

First check the existing dotfiles in the system home directory, and delete them manually. Then:.

```bash
./install
```

## Installation in a new computer or empty user, from the home directory run:

```bash
mkdir repos
cd repos

git clone https://github.com/bryant1410/dotfiles
cd dotfiles

./install
```

## Install the apt and snap packages

```bash
git submodule update --init --recursive dotbot-apt-get
sudo ./install -p dotbot-apt-get/aptget.py -c apt.conf.yaml
```

TODO: move non-sudo stuff of apt
TODO: pyenv and/or miniconda
TODO: prey, [globus](https://downloads.globus.org/globus-connect-personal/v3/linux/stable/globusconnectpersonal-latest.tgz)

Run the following to finish the Dropbox installation:

```bash
~/.dropbox-dist/dropboxd
```

## Some comments

I save the git config in a 2nd user-specific path, so I can override stuff in the local machine, such as the email. 
