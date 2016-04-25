function Menu()
{
    this.init();
}

Menu.prototype =
{

    foregroundColor: null,
    selector: null,

    init: function()
    {
        function newColorWell(width, height, identifier)
        {
            var well = document.getElementById("brush-color");
            well.style.cursor = 'pointer';
            well.width = width;
            well.height = height;
            return well;
        }

        var option, space, separator, color_width = 48, color_height = 20;


        this.foregroundColor = newColorWell(color_width, color_height, 'fg-color');

        this.setForegroundColor( COLOR );

        this.selector = document.getElementById("brush-type");

        for (i = 0; i < BRUSHES.length; i++)
        {
            option = document.createElement("option");
            option.id = i;
            option.textContent = BRUSHES[i].toUpperCase();
            this.selector.appendChild(option);
        }
    },

    setForegroundColor: function( color )
    {
        this.foregroundColor.style.backgroundColor = 'rgb(' + color[0] + ', ' + color[1] +', ' + color[2] + ')';
    },
}
