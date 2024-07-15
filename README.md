# Santiago's dotfiles

These are my dotfiles and specific computer configuration steps. Feel free to borrow what you find useful, but consider many steps are tailored to me.

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
cd ~
git clone --recurse-submodules https://github.com/bryant1410/dotfiles
cd .dotfiles

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

2. A Dropbox-related window may appear. Follow its steps to finish Dropbox's installation.

3. Set "JetBrains Mono Regular" as the font for the system Terminal, Sublime, VS Code, and Guake. Enable the font ligatures wherever possible.

4. Enable settings sync in the JetBrains IDEs.

5. Add Guake to the list of Startup Applications.

6. Install and set up Prey:

    ```bash
    TEMP_DEB=$(mktemp) && wget -O "$TEMP_DEB" 'https://downloads.preyproject.com/prey-client-releases/node-client/1.12.10/prey_1.12.10_amd64.deb' && sudo dpkg --skip-same-version -i "$TEMP_DEB" && rm -f "$TEMP_DEB"
    sudo apt --fix-broken -y install  # Install Prey dependencies.
    ```

7. Symlink `Pictures` to `Dropbox/Pictures`:

    ```bash
    rmdir ~/Pictures/
    ln -s Dropbox/Pictures ~/Pictures
    ```

8. Symlink the Sublime user packages to the ones in `Dropbox/Sublime` (see more in https://stackoverflow.com/a/11399206/1165181):

    ```bash
    rm -rf ~/.config/sublime-text/Packages/User
    ln -s ~/Dropbox/Sublime/Packages/User ~/.config/sublime-text/Packages/User
    ```

9. Make Calibre use the library in `Dropbox/Calibre Library`.

10. Log out and log back in for Docker to work without sudo.

11. Set up the local bashrc and netrc file:

    ```bash
    pushd ~
    ln -s ~/Dropbox/.bashrc.local
    ln -s ~/Dropbox/.netrc
    popd
    ```

12. Set up an echo cancellation mic:

    ```bash
    cat <<EOF | sudo tee -a /etc/pulse/default.pa
    .ifexists module-echo-cancel.so
    load-module module-echo-cancel aec_method=webrtc source_name=echo_cancelled source_properties=device.description=EchoCancelled sink_name=echo_cancelled_sink
    set-default-source echo_cancelled
    set-default-sink echo_cancelled_sink
    .endif
    EOF
    pulseaudio -k
    sudo addgroup $USER audio  # To load the config at boot time.
    ```

13. Run the following to include some common SSH configs:

    ```bash
    if ! grep -q 'Include ~/Dropbox/ssh_config' ~/.ssh/config; then
        echo Include ~/Dropbox/ssh_config >> ~/.ssh/config
    fi
    ```

14. [Free the key binding <kbd>Ctrl + .</kbd> so it can be used by IntelliJ.](https://askubuntu.com/a/1404462/342057)

15. Mendeley app (and any other AppImage Electron app) may have a problem with detecting the GPU on sandbox mode. Modify Mendeley's desktop link (located under a path like `~/.local/share/applications/appimagekit_113745347684e95417b93e5a7c4f2967-mendeley-reference-manager.desktop`) to run with the flag `--no-sandbox`.

16. [Set up the SSH keys for GitHub.](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

17. [Test WebGL on Chrome](https://webglsamples.org/aquarium/aquarium.html) (you should get 50-60 FPS). If not, [force hardware-accelerated rendering in Google Chrome](https://askubuntu.com/questions/299345/how-to-enable-webgl-in-chrome-on-ubuntu).

18. [Allow ImageMagick to write PDFs.](https://stackoverflow.com/a/53180170/1165181)

## About the Git Configuration

I save the git config in a 2nd user-specific path (`~/.config/git/config`), so I can override stuff in the local machine (in `~/.gitconfig`), such as the email. 

## If bash gets slow to load

To debug the `~/.bashrc` file when opening a new terminal gets slow, see [this gist](https://gist.github.com/bryant1410/fa9c595c599afa763f055ee72b2f7944).
