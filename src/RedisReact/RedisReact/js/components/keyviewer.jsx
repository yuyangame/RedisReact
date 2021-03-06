﻿var KeyViewer = React.createClass({
    mixins: [
        DebugLogMixin,
        Router.Navigation,
        Router.State,
        Reflux.listenTo(SettingsStore, "onSettingsUpdated"),
        Reflux.listenTo(KeyStore, "onKeyLoaded")
    ],
    componentWillMount: function () {
        this.setState({ appRawMode: SettingsStore.appRawMode, rawModes: {}, relatedKeys: [] });
        var q = this.getQuery();
        Actions.loadKey(q.id, q.type);
        document.addEventListener('keyup', this.globalKeyUp);
    },
    componentWillUnmount: function () {
        document.removeEventListener('keyup', this.globalKeyUp);
    },
    componentWillReceiveProps: function () {
        var q = this.getQuery();
        Actions.loadKey(q.id, q.type);
    },
    onSettingsUpdated: function (settings) {
        this.setState({ appRawMode: settings.appRawMode, rawModes: {} });
    },
    onKeyLoaded: function (result) {
        this.setState({ result: result });
    },
    navToKey: function (e) {
        var tr = $(e.target).parents("tr");
        this.viewKey(tr.data("id"), tr.data("type"));
    },
    viewKey: function(id, type){
        var args = { id: id, type: type };
        this.transitionTo("keys", null, args);
    },
    console: function () {
        this.transitionTo("console");
        var type = this.state.result.type;
        var cmd = 'GET ' + this.state.result.id;
        if (type == 'list')
            cmd = 'LRANGE ' + this.state.result.id + ' 0 -1';
        else if (type == 'set')
            cmd = 'SMEMBERS ' + this.state.result.id;
        else if (type == 'zset')
            cmd = 'ZRANGE ' + this.state.result.id + ' 0 -1 WITHSCORES';
        else if (type == 'hash')
            cmd = 'HGETALL ' + this.state.result.id;
        Actions.setConsole(cmd);
    },
    edit: function () {
        this.transitionTo("console", null, {expand:true});
        Actions.setConsole('SET ' + this.state.result.id + ' ' + this.state.result.value);
    },
    del: function () {
        this.transitionTo("console");
        Actions.setConsole('DEL ' + this.state.result.id);
    },
    delAll: function () {
        this.transitionTo("console");
        var cmd = 'DEL ' + this.state.result.id;

        var relatedKeys = this.state.result.relatedKeys || {};
        Object.keys(relatedKeys).forEach(function (id) {
            if (!relatedKeys[id]) return;
            cmd += ' ' + id;
        });

        Actions.setConsole(cmd);
    },
    toggleRawMode: function (pos, e) {
        if (hasTextSelected())
            return;

        if (this.state.rawModes[pos] && (e.shiftKey || e.ctrlKey)) {
            selectText(e.target);
            return;
        }

        this.state.rawModes[pos] = !this.state.rawModes[pos];
        this.setState({ rawModes: this.state.rawModes });
    },
    globalKeyUp: function (e) {
        var shortcutKeys = [Keys.LEFT, Keys.RIGHT];
        if (e.altKey || e.ctrlKey || shortcutKeys.indexOf(e.which) == -1)
            return;

        var nextKeyPos = e.which == Keys.LEFT
            ? -1
            : 1;

        var id = this.getQuery().id;
        var similarKeys = this.state.result.similarKeys || [];
        for (var i = 0; i < similarKeys.length; i++) {
            var key = similarKeys[i];
            if (key.id == id) {
                var nextKey = similarKeys[i + nextKeyPos];
                if (nextKey) {
                    this.viewKey(nextKey.id, nextKey.type);
                }
                return;
            }
        }
    },
    render: function () {
        var $this = this;
        var View = <div>Key does not exist</div>;
        var SimilarKeys = <div/>;

        var result = this.state.result;
        if (result && result.similarKeys) {
            SimilarKeys = (
                <table className="table">
                <tbody>
                <tr>
                    <th>{result.query}</th>
                </tr>
                    {result.similarKeys.map(function(r){
                        var activeClass = r.id == result.id ? 'active ' : '';
                        var activeIcon = activeClass
                            ? <b className="octicon octicon-chevron-right"></b>
                            : <b></b>;

                        return (
                            <tr key={r.id} className={activeClass} onClick={$this.navToKey} data-id={r.id} data-type={r.type}>
                                <td>
                                    {activeIcon}
                                    {r.id}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                </table>
            );
        }

        var relatedKeys = result && result.relatedKeys || {};
        var id = this.getQuery().id;
        var rawModes = this.state.rawModes;
        var i = 0;

        var Edit = null;
        if (result && result.type == 'string') {
            Edit = (<div className="action" onClick={this.edit}>
                        <span className="octicon octicon-pencil"></span><b>edit</b>
                    </div>);
        }
        var DeleteAll = null;
        if (Object.keys(relatedKeys).length > 0) {
            DeleteAll = (<div className="action" onClick={this.delAll}>
                    <span className="octicon octicon-x"></span><b>all</b>
                </div>);
        }

        return (
          <div id="keyviewer-page">
            <div className="actions">
                <div className="action" onClick={this.console}>
                    <span className="octicon octicon-terminal"></span>
                    <b>console</b>
                </div>
                {Edit}
                <div className="action" onClick={this.del}>
                    <span className="octicon octicon-x"></span>
                    <b>delete</b>
                </div>
                {DeleteAll}
            </div>
              <div className="content">
                <div id="similarkeys" title="use left/right arrow keys">
                    {SimilarKeys}
                </div>
                <div id="keyview">
                    <KeyView key={id} result={result} rawMode={this.state.appRawMode ? !rawModes[i] : rawModes[i]} toggleRawMode={this.toggleRawMode.bind(this, i)} isPrimary={true} />
                    {Object.keys(relatedKeys).map(function(id){
                        if (!relatedKeys[id]) return;
                        i++;
                        var result = {id: id, value:relatedKeys[id], type:'string'};
                        return (
                            <KeyView key={id} result={result} rawMode={$this.state.appRawMode ? !rawModes[i] : rawModes[i]} toggleRawMode={$this.toggleRawMode.bind($this, i)} />
                        );
                    })}
                </div>
              </div>
          </div>
        );
    }
});